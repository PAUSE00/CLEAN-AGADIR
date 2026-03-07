import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 px-4 focus:outline-none focus:border-[#00e5b8]/50 focus:ring-1 focus:ring-[#00e5b8]/50 transition-all font-sans ' +
                className
            }
            ref={localRef}
        />
    );
});
