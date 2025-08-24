export default function Hero() {
  const LOGO_URL = "https://<your-public-cdn>/boom_studio_logo.jpeg"; // replace with hosted logo

  return (
    <section className="min-h-screen bg-gradient-to-r from-electric-purple via-neon-red to-background flex items-center justify-center p-6">
      <main className="text-center max-w-[780px] mx-auto">
        <img
          src={LOGO_URL}
          alt="BOOM Studio Logo"
          className="mx-auto w-[72%] max-w-[420px] h-auto drop-shadow-[0_6px_22px_rgba(255,49,49,0.35)]"
        />
        <h1 className="mt-8 text-white font-montserrat font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-wide">
          BOOM Studio
        </h1>
        <p className="mt-4 text-white/90 font-poppins text-lg sm:text-xl md:text-2xl tracking-wide">
          Pro edits. One tap. <span className="text-neon-red font-bold">BOOM</span>
        </p>

        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <a
            href="#get-started"
            className="px-6 py-3 rounded-full bg-neon-red text-white font-poppins font-semibold text-sm sm:text-base shadow-[0_6px_20px_rgba(255,49,49,0.45)] hover:opacity-90 transition-all duration-300"
          >
            Start Creating Now
          </a>
          <a
            href="#watch-demo"
            className="px-6 py-3 rounded-full bg-white/10 text-white text-sm sm:text-base font-poppins font-medium backdrop-blur hover:bg-white/15 transition-all duration-300"
          >
            Watch Demo
          </a>
        </div>
      </main>
    </section>
  );
}