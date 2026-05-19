export interface GoogleAccount {
    email: string;
    name: string;
    picture: string;
    id: string;
}

export const linkGoogleAccount = async (): Promise<GoogleAccount | null> => {
    return new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: true }, async (token) => {
            if (chrome.runtime.lastError || !token) {
                console.error("Google Auth Error:", chrome.runtime.lastError);
                resolve(null);
                return;
            }

            try {
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
                resolve(account);
            } catch (error) {
                console.error("User Info Fetch Error:", error);
                resolve(null);
            }
        });
    });
};

export const getLinkedAccount = async (): Promise<GoogleAccount | null> => {
    const data = await chrome.storage.local.get('googleAccount');
    return data.googleAccount || null;
};

export const unlinkGoogleAccount = async () => {
    return new Promise<void>((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                const url = `https://accounts.google.com/o/oauth2/revoke?token=${token}`;
                fetch(url);
                chrome.identity.removeCachedAuthToken({ token }, () => {
                    chrome.storage.local.remove('googleAccount');
                    resolve();
                });
            } else {
                chrome.storage.local.remove('googleAccount');
                resolve();
            }
        });
    });
};

export const uploadToDrive = async (fileName: string, content: string): Promise<boolean | string> => {
    return new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, async (token) => {
            if (chrome.runtime.lastError || !token) {
                console.warn("No token available for backup. Trying interactive...");
                chrome.identity.getAuthToken({ interactive: true }, async (interactiveToken) => {
                    if (chrome.runtime.lastError || !interactiveToken) {
                        resolve(false);
                        return;
                    }
                    resolve(doUpload(interactiveToken, fileName, content));
                });
                return;
            }
            resolve(doUpload(token, fileName, content));
        });
    });
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
