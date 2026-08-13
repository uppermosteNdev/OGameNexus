import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("OGame Nexus Dashboard UI Error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    backgroundColor: '#0a0d14',
                    color: '#e2e8f0',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        maxWidth: '650px',
                        background: 'rgba(23, 27, 38, 0.95)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        padding: '2rem',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ color: '#f87171', fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                            Nexus Dashboard encountered an error
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            An unexpected error occurred while rendering the dashboard UI.
                        </p>
                        
                        <div style={{
                            background: '#06080e',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            color: '#f87171',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            marginBottom: '1.5rem',
                            wordBreak: 'break-word'
                        }}>
                            {this.state.error?.toString()}
                            {this.state.errorInfo?.componentStack && (
                                <div style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                                    {this.state.errorInfo.componentStack}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Reload Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
