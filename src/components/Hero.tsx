export default function Hero() {
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
          <a href="#get-started" 
             className="w-full sm:w-auto px-5 py-3 rounded-full bg-boom-primary text-white font-poppins font-semibold
                        shadow-[0_6px_20px_rgba(255,77,90,0.45)] hover:opacity-90 transition-all duration-200">
            Start Creating Now
          </a>
          <a href="#watch-demo"
             className="w-full sm:w-auto px-5 py-3 rounded-full bg-white/10 text-white font-poppins font-medium
                        backdrop-blur hover:bg-white/15 transition-all duration-200">
            Watch Demo
          </a>
        </div>

        {/* Trust indicators */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 
                        text-white/60 font-poppins text-xs sm:text-sm">
          <span>⚡ AI-Powered Clips</span>
          <span className="hidden sm:inline">•</span>
          <span>🎨 Auto Editing</span>
          <span className="hidden sm:inline">•</span>
          <span>🚀 One-Tap Publishing</span>
        </div>
      </div>

      {/* Soft vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
           style={{background: 'radial-gradient(1200px 600px at 50% 50%, transparent 40%, hsl(var(--background)) 100%)'}} />
    </section>
  );
}