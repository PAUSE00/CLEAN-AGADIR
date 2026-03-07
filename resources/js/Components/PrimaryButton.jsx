export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00e5b8] to-[#00a383] text-[#050b14] font-bold text-sm tracking-wide disabled:opacity-50 transition-all shadow-[0_4px_14px_rgba(0,229,184,0.4)] flex items-center justify-center uppercase font-['Space_Grotesk'] hover:scale-[1.02] active:scale-[0.98] ${disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
