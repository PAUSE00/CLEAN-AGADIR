export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-white/20 bg-[#050b14] text-[#00e5b8] shadow-sm focus:ring-[#00e5b8]/50 ' +
                className
            }
        />
    );
}
