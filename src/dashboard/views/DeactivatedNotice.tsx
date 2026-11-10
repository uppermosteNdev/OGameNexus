import React from 'react';
import { ShieldAlert, Database, ExternalLink, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import StarField from '../components/StarField';

export const DeactivatedNotice: React.FC = () => {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(ellipse at top, #0b1329 0%, #030712 100%)',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <StarField />

      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '680px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)',
        textAlign: 'center'
      }}>
        {/* Warning Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)'
        }}>
          <ShieldAlert size={34} color="#f59e0b" />
        </div>

        {/* Title & Version */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          borderRadius: '9999px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#fca5a5',
          fontSize: '11.5px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '14px'
        }}>
          <AlertTriangle size={13} />
          <span>Compliance Safety Mode • v1.3.1</span>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          margin: '0 0 12px 0',
          letterSpacing: '-0.02em',
          color: '#ffffff'
        }}>
          OGame Nexus is Currently Deactivated
        </h1>

        <p style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#94a3b8',
          margin: '0 0 24px 0'
        }}>
          Pursuant to instructions from the Gameforge Tool Team regarding version 1.3.0, OGame Nexus has been completely deactivated across all in-game pages and background services. The extension makes <strong>zero background calls</strong> and does not modify the game in any way.
        </p>

        {/* Data Safety Assurance Box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.12) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'left',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Database size={20} color="#34d399" />
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#34d399' }}>
              Your Player Data is 100% Safe
            </span>
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.55', color: '#cbd5e1', margin: '0 0 8px 0' }}>
            All your historical combat logs, expedition analytics, notes, lifeform progression, and empire configurations remain intact in your local browser database.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#86efac' }}>
            <CheckCircle size={15} color="#86efac" />
            <span>None of your data has been deleted, and everything will be available again once the extension regains tolerated status.</span>
          </div>
        </div>

        {/* Action / Guidance Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '16px',
          fontSize: '12.5px',
          lineHeight: '1.6',
          color: '#94a3b8',
          textAlign: 'left',
          marginBottom: '26px'
        }}>
          <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '4px' }}>
            What you can do:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            <li style={{ marginBottom: '6px' }}>
              <strong>Keep it installed:</strong> In version 1.3.1, the extension is completely inert and does not touch OGame in any way, which preserves your local database for future compliant releases.
            </li>
            <li>
              <strong>Or uninstall anytime:</strong> You may remove the extension at any time via your browser's extensions page (<code style={{ color: '#7dd3fc', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>chrome://extensions</code>).
            </li>
          </ul>
        </div>

        {/* Buttons / External links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <a
            href="https://discord.gg/Jm4haETTYp"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #5865f2 0%, #4752c4 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(88, 101, 242, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={16} />
            <span>Join Official Discord for Updates</span>
            <ExternalLink size={13} style={{ opacity: 0.7 }} />
          </a>
        </div>
      </div>
    </div>
  );
};
