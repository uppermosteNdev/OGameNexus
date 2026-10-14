import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface Props {
    children: ReactNode;
    fallbackTitle?: string;
    compact?: boolean;
    onReset?: () => void;
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

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.compact) {
                return (
                    <div style={{
                        padding: '32px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        margin: '16px 0',
                        color: '#e2e8f0',
                        backdropFilter: 'blur(12px)',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
                        <h3 style={{ color: '#f87171', fontSize: '1.15rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                            {this.props.fallbackTitle || 'Module Encountered an Error'}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', maxWidth: '500px', lineHeight: 1.5 }}>
                            This module encountered an issue while rendering telemetry. You can retry loading the module or switch to other tactical sections.
                        </p>
                        {this.state.error && (
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                color: '#fca5a5',
                                maxWidth: '550px',
                                maxHeight: '100px',
                                overflowY: 'auto',
                                wordBreak: 'break-word',
                                textAlign: 'left',
                                marginBottom: '1.25rem',
                            }}>
                                {this.state.error.toString()}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={this.handleReset}
                                style={{
                                    background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.2) 0%, rgba(0, 242, 255, 0.08) 100%)',
                                    color: '#00f2ff',
                                    border: '1px solid rgba(0, 242, 255, 0.4)',
                                    borderRadius: '9999px',
                                    padding: '8px 16px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>Retry Module</span>
                            </button>
                            <button
                                type="button"
                                onClick={this.handleReload}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    color: '#cbd5e1',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '9999px',
                                    padding: '8px 16px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                Reload Dashboard
                            </button>
                        </div>
                    </div>
                );
            }

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
