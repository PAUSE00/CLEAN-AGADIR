import React from 'react';

export default function ToastContainer({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className="toast-slide" style={{
                    background: t.type === 'err' ? "rgba(244,63,94,.95)" : "rgba(0,229,184,.95)",
                    color: t.type === 'err' ? "#fff" : "#07111e",
                    padding: "12px 18px", borderRadius: 8,
                    fontSize: 12, fontWeight: 600,
                    boxShadow: "0 4px 15px rgba(0,0,0,.3)",
                    display: "flex", alignItems: "center", gap: 10, maxWidth: 350
                }}>
                    <span style={{ fontSize: 16 }}>{t.type === 'err' ? '🚨' : '✅'}</span>
                    <span>{t.msg}</span>
                </div>
            ))}
        </div>
    );
}
