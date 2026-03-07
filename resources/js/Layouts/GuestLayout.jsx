import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, Head } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#050b14] relative flex flex-col items-center justify-center pt-6 sm:pt-0 overflow-hidden font-sans">
            <Head>
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
            </Head>
            {/* Background Blob Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(0,229,184,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
            </div>

            <div className="relative z-10 flex flex-col justify-center items-center mb-6">
                <Link href="/" className="flex flex-col items-center gap-2 group">
                    <div className="text-4xl filter drop-shadow-[0_0_10px_rgba(0,229,184,0.5)] group-hover:scale-110 transition-transform">♻️</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-[#00e5b8] to-[#00a383] bg-clip-text text-transparent font-['Space_Grotesk'] tracking-widest uppercase">
                        VillePropre
                    </div>
                </Link>
            </div>

            <div className="relative z-10 w-full sm:max-w-md overflow-hidden rounded-2xl shadow-[0_16px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,229,184,0.06),inset_0_1px_0_rgba(255,255,255,0.05)] border border-[rgba(0,229,184,0.2)] bg-[#050b14]/90 backdrop-blur-[24px] px-8 py-10" style={{ WebkitBackdropFilter: 'blur(24px)' }}>
                {children}
            </div>
        </div>
    );
}
