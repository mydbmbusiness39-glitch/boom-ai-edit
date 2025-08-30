import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Hero() {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center bg-background overflow-hidden">
      {/* Gradient auras */}
      <div className="absolute -top-36 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-45 pointer-events-none"
           style={{background: 'radial-gradient(circle, hsl(var(--boom-primary)) 0%, transparent 60%)'}} />
      <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-45 pointer-events-none"
           style={{background: 'radial-gradient(circle, hsl(var(--boom-secondary)) 0%, transparent 60%)'}} />

      {/* Main content card */}
      <div className="relative z-10 w-[92%] max-w-[980px] p-6 sm:p-8 md:p-10
                      bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl
                      shadow-[0_10px_50px_rgba(0,0,0,0.45)]">
        
        {/* Logo */}
        <div className="text-center mb-6">
          {!logoError ? (
            <img
              src="/assets/boomstudio-logo.png"
              alt="BoomStudio Logo"
              className="mx-auto w-[72%] max-w-[420px] h-auto drop-shadow-[0_6px_22px_rgba(255,77,90,0.35)]"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="mx-auto w-[72%] max-w-[420px] h-24 flex items-center justify-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-boom-primary to-boom-secondary bg-clip-text text-transparent">
                BoomStudio Logo
              </span>
            </div>
          )}
        </div>

        {/* Brand title */}
        <div className="text-center mb-4">
          <h1 className="font-montserrat text-3xl sm:text-4xl md:text-6xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
              BoomStudio
            </span>
          </h1>
        </div>

        {/* Main tagline */}
        <p className="text-center text-white/92 font-poppins font-bold text-xl sm:text-2xl md:text-3xl">
          ClipIt. FlipIt. BoomIt.
        </p>

        {/* Subtitle */}
        <p className="mt-3 text-center text-white/70 font-poppins text-base sm:text-lg max-w-2xl mx-auto">
          Fast. Fun. AI-powered video editing for creators.
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="w-full sm:w-auto font-poppins font-semibold shadow-[0_6px_20px_rgba(255,77,90,0.45)]">
            Start Creating Now
          </Button>
          <Button 
            variant="secondary"
            onClick={() => navigate('/demo')}
            className="w-full sm:w-auto font-poppins font-medium">
            Watch Demo
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
          <Badge variant="secondary">⚡ AI-Powered Clips</Badge>
          <Badge variant="secondary">🎬 Auto Editing</Badge>
          <Badge variant="secondary">📲 One-Tap Publishing</Badge>
        </div>
      </div>

      {/* Soft vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
           style={{background: 'radial-gradient(1200px 600px at 50% 50%, transparent 40%, hsl(var(--background)) 100%)'}} />
    </section>
  );
}