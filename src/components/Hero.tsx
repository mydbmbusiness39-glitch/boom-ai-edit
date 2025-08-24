export default function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center bg-background overflow-hidden">
      {/* Gradient auras */}
      <div className="absolute -top-36 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-45 pointer-events-none"
           style={{background: 'radial-gradient(circle, hsl(var(--electric-purple)) 0%, transparent 60%)'}} />
      <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-45 pointer-events-none"
           style={{background: 'radial-gradient(circle, hsl(var(--neon-red)) 0%, transparent 60%)'}} />

      {/* Main content card */}
      <div className="relative z-10 w-[92%] max-w-[980px] p-6 sm:p-8 md:p-10
                      bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl
                      shadow-[0_10px_50px_rgba(0,0,0,0.45)]">
        
        {/* Brand logo/title */}
        <div className="text-center mb-6">
          <h1 className="font-montserrat text-4xl sm:text-5xl md:text-7xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-electric-purple via-neon-red to-aqua-cyan bg-clip-text text-transparent">
              BOOM Studio
            </span>
          </h1>
        </div>

        {/* Main tagline */}
        <p className="text-center text-white/92 font-poppins font-semibold text-lg sm:text-xl md:text-2xl">
          Pro edits. One tap.
        </p>

        {/* Subtitle */}
        <p className="mt-2 text-center text-white/60 font-poppins text-sm sm:text-base max-w-2xl mx-auto">
          CapCut-simple workflow with AI superpowers: auto-clips, captions, overlays, and one-tap publishing.
        </p>

        {/* CTA buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="#get-started" 
             className="w-full sm:w-auto px-6 py-3 rounded-full bg-neon-red text-white font-poppins font-semibold
                        shadow-[0_6px_20px_rgba(255,49,49,0.45)] hover:opacity-90 hover:translate-y-px
                        transition-all duration-200">
            Start Creating Now
          </a>
          <a href="#watch-demo"
             className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/8 text-white font-poppins font-medium
                        border border-white/15 hover:bg-white/12 transition-all duration-200">
            Watch Demo
          </a>
        </div>

        {/* Trust indicators */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 
                        text-white/55 font-poppins text-xs sm:text-sm">
          <span>⚡ 1-tap Clip & Post</span>
          <span className="hidden sm:inline">•</span>
          <span>🎙️ AI Voice & Captions</span>
          <span className="hidden sm:inline">•</span>
          <span>🔒 Secure & Private</span>
        </div>
      </div>

      {/* Soft vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
           style={{background: 'radial-gradient(1200px 600px at 50% 50%, transparent 40%, hsl(var(--background)) 100%)'}} />
    </section>
  );
}