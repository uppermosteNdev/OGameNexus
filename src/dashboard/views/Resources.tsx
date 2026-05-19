import React from 'react';

const Resources: React.FC = () => {
    return (
        <div className="view">
            <h1>Resource Management</h1>
            <p>Analyze your production rates and storage capacities across all planets.</p>

            <div className="glass" style={{ padding: '40px', textAlign: 'center', marginTop: '32px' }}>
                <div style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}>Coming Soon</div>
                <p>Production charts and storage alerts will be displayed here.</p>
            </div>
        </div>
    );
};

export default Resources;
