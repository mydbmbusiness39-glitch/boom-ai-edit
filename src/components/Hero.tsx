export default function Hero() {
  return (
    <section
      className="
        relative min-h-[92vh] flex items-center justify-center overflow-hidden
        bg-background
      "
    >
      {/* Gradient aura */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-40" 
             style={{background: 'var(--gradient-radial-purple)'}} />
        <div className="absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
             style={{background: 'var(--gradient-radial-red)'}} />
      </div>

      {/* Content card */}
      <div className="
        relative z-10 mx-auto w-[92%] max-w-[980px]
        rounded-2xl border border-white/10
        bg-white/5 backdrop-blur-md
        shadow-[0_10px_50px_rgba(0,0,0,0.45)]
        p-6 sm:p-10
      ">
        {/* Logo */}
        <div className="mx-auto text-center mb-6">
          <h1 className="font-montserrat text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-r from-electric-purple via-neon-red to-aqua-cyan bg-clip-text text-transparent">
              BOOM Studio
            </span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-center text-lg sm:text-xl md:text-2xl font-poppins font-semibold text-vibrant-yellow">
          Pro edits. <span className="text-vibrant-yellow">One tap.</span>
        </p>

        {/* Subcopy */}
        <p className="mt-3 text-center text-sm sm:text-base text-white/60 font-poppins">
          CapCut-simple workflow with AI superpowers: auto-clips, captions, overlays, and one-tap publishing.
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#get-started"
            className="
              inline-flex items-center justify-center
              rounded-full px-6 py-3
              bg-neon-red text-white font-semibold font-poppins
              shadow-[0_6px_20px_rgba(255,49,49,0.45)]
              hover:opacity-90 active:translate-y-[1px] transition-all duration-300
              w-full sm:w-auto
            "
          >
            Start Creating Now
          </a>

          <a
            href="#watch-demo"
            className="
              inline-flex items-center justify-center
              rounded-full px-6 py-3
              bg-white/10 text-white font-poppins
              hover:bg-white/15 transition-all duration-300
              border border-white/15
              w-full sm:w-auto
            "
          >
            Watch Demo
          </a>
        </div>

        {/* Trust strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/50 font-poppins">
          <span>⚡ 1-tap Clip & Post</span>
          <span>•</span>
          <span>🎙️ AI Voice & Captions</span>
          <span>•</span>
          <span>🔒 Secure & Private</span>
        </div>
      </div>

      {/* Soft vignette edge */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_center,transparent_40%,hsl(var(--background))_100%)]" />
    </section>
  );
}