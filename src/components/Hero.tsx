import { Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-electric-purple via-neon-red to-background flex items-center justify-center p-6">
      <main className="text-center max-w-[720px] mx-auto">
        <div className="relative inline-block mb-8">
          <div className="absolute -inset-6 bg-gradient-to-r from-electric-purple via-neon-red to-aqua-cyan rounded-full blur-2xl opacity-30 animate-pulse" />
          <div className="relative bg-gradient-to-r from-electric-purple to-neon-red bg-clip-text text-transparent">
            <Sparkles className="relative h-24 w-24 mx-auto text-electric-purple" />
          </div>
        </div>
        
        <h1 className="font-montserrat text-6xl md:text-8xl font-black tracking-tight mb-8">
          <span className="bg-gradient-to-r from-electric-purple via-neon-red to-aqua-cyan bg-clip-text text-transparent">
            BOOM Studio
          </span>
        </h1>
        
        <p className="mt-8 text-white/90 text-xl md:text-2xl tracking-wide font-poppins">
          Pro edits. One tap. <span className="font-extrabold text-neon-red animate-pulse">BOOM</span>
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="#get-started"
            className="px-5 py-3 rounded-full bg-neon-red hover:bg-neon-red/90 text-white text-sm md:text-base font-semibold hover:shadow-lg hover:shadow-neon-red/50 transition-all duration-300"
          >
            Start Creating Now
          </a>
          <a
            href="#watch-demo"
            className="px-5 py-3 rounded-full bg-white/10 text-white text-sm md:text-base font-medium backdrop-blur hover:bg-white/15 transition-all duration-300"
          >
            Watch Demo
          </a>
        </div>
      </main>
    </div>
  );
}