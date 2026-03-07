import React from 'react';

export function Sec({ title, children }) {
    return <div className="sec"><div className="sh">{title}</div>{children}</div>;
}

export function AnimatedCounter({ value, duration = 800 }) {
    const [count, setCount] = React.useState(0);
    React.useEffect(() => {
        const end = parseFloat(value) || 0;
        if (end === 0) { setCount(0); return; }
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            setCount(Math.floor(p * end));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [value, duration]);
    return <span>{count}</span>;
}

export function LoadingSkeleton({ rows = 4 }) {
    return (
        <div style={{ padding: 12 }}>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className={`skeleton skeleton-card`} style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
    );
}

export function EmptyState({ icon = '📭', text = 'Aucune donnée disponible' }) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <div className="empty-state-text">{text}</div>
        </div>
    );
}
