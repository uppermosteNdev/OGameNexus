export interface GoogleAccount {
    email: string;
    name: string;
    picture: string;
    id: string;
}

// Cross-browser helper to get a Google Access Token
const getGoogleAccessToken = async (interactive: boolean): Promise<string | null> => {
    // 1. Chrome environment: use the profile-native identity API
    if (typeof chrome !== 'undefined' && chrome.identity && typeof chrome.identity.getAuthToken === 'function') {
        return new Promise((resolve) => {
            chrome.identity.getAuthToken({ interactive }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    resolve(null);
                } else {
                    resolve(token);
                }
            });
        });
    }

    // 2. Non-Chrome (Firefox/Gecko) environments: use launchWebAuthFlow redirect flow
    const stored = await chrome.storage.local.get(['googleAccessToken', 'googleTokenExpiry']);
    if (stored.googleAccessToken && stored.googleTokenExpiry && stored.googleTokenExpiry > Date.now()) {
        return stored.googleAccessToken;
    }

    if (!interactive) {
        return null;
    }

    const clientId = "827037596104-tb48f08p9pvvr9h4fdjmq1ie1kp9qfa5.apps.googleusercontent.com";
    const redirectUrl = typeof chrome !== 'undefined' && chrome.identity && typeof chrome.identity.getRedirectURL === 'function'
        ? chrome.identity.getRedirectURL()
        : "https://identity.mozilla.org/v1/webauthflow";

    const scopes = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/drive.file"
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
        `&scope=${encodeURIComponent(scopes.join(' '))}`;

    return new Promise((resolve) => {
        chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        }, async (responseUrl) => {
            if (chrome.runtime.lastError || !responseUrl) {
                console.error("launchWebAuthFlow Error:", chrome.runtime.lastError);
                resolve(null);
                return;
            }

            try {
                const url = new URL(responseUrl);
                const params = new URLSearchParams(url.hash.substring(1));
                const token = params.get('access_token');
                const expiresIn = params.get('expires_in');

                if (token) {
                    const expiry = Date.now() + (parseInt(expiresIn || '3600') * 1000);
                    await chrome.storage.local.set({
                        googleAccessToken: token,
                        googleTokenExpiry: expiry
                    });
                    resolve(token);
                } else {
                    resolve(null);
                }
            } catch (err) {
                console.error("OAuth response parsing error:", err);
                resolve(null);
            }
        });
    });
};

export const linkGoogleAccount = async (): Promise<GoogleAccount | null> => {
    try {
        const token = await getGoogleAccessToken(true);
        if (!token) {
            return null;
        }

        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const data = await response.json();
        const account: GoogleAccount = {
            email: data.email,
            name: data.name,
            picture: data.picture,
            id: data.id
        };

        // Store account info in chrome.storage
        await chrome.storage.local.set({ googleAccount: account });
        return account;
    } catch (error) {
        console.error("linkGoogleAccount Error:", error);
        return null;
    }
};

export const getLinkedAccount = async (): Promise<GoogleAccount | null> => {
    const data = await chrome.storage.local.get('googleAccount');
    return data.googleAccount || null;
};

export const unlinkGoogleAccount = async () => {
    // 1. Remove storage-cached elements for both custom flows and Chrome flows
    await chrome.storage.local.remove(['googleAccessToken', 'googleTokenExpiry', 'googleAccount']);

    // 2. If native Chrome APIs are present, revoke and clear Chrome's cached token
    if (typeof chrome !== 'undefined' && chrome.identity && typeof chrome.identity.getAuthToken === 'function') {
        return new Promise<void>((resolve) => {
            chrome.identity.getAuthToken({ interactive: false }, (token) => {
                if (token) {
                    const url = `https://accounts.google.com/o/oauth2/revoke?token=${token}`;
                    fetch(url).catch(err => console.error("Revocation request error:", err));
                    chrome.identity.removeCachedAuthToken({ token }, () => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }
};

export const uploadToDrive = async (fileName: string, content: string): Promise<boolean | string> => {
    try {
        // Try getting token non-interactively
        let token = await getGoogleAccessToken(false);
        if (!token) {
            console.warn("No token available for backup. Trying interactive...");
            token = await getGoogleAccessToken(true);
        }
        if (!token) {
            return false;
        }
        return doUpload(token, fileName, content);
    } catch (err) {
        console.error("uploadToDrive Error:", err);
        return false;
    }
};

const doUpload = async (token: string, fileName: string, content: string): Promise<boolean | string> => {
    try {
        const metadata = {
            name: fileName,
            mimeType: 'application/json'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([content], { type: 'application/json' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: form
        });

        if (response.ok) {
            const data = await response.json();
            return data.id; // Return file ID on success
        }
        return false;
    } catch (error) {
        console.error("Upload to Drive Error:", error);
        return false;
    }
};
