// RGB Gamer Style Configuration
export const rgbStyle = {
  id: "rgb-gamer",
  name: "RGB Gamer",
  
  // Typography
  typography: {
    headline: {
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: "800",
      fontSize: "clamp(2rem, 8vw, 4rem)",
      lineHeight: "0.9",
      letterSpacing: "-0.02em",
      textTransform: "uppercase" as const,
    },
    body: {
      fontFamily: "Inter, system-ui, sans-serif", 
      fontWeight: "600",
      fontSize: "clamp(1rem, 4vw, 1.5rem)",
      lineHeight: "1.2",
      letterSpacing: "0.01em",
    }
  },

  // Colors & Effects
  colors: {
    primary: "hsl(280, 100%, 60%)", // neon purple
    secondary: "hsl(160, 100%, 50%)", // neon green
    accent: "hsl(320, 100%, 70%)", // neon pink
    background: "hsl(220, 30%, 5%)", // dark
    text: "hsl(0, 0%, 95%)", // bright white
  },

  // Visual Effects
  effects: {
    flicker: {
      keyframes: "flicker 0.15s infinite linear alternate",
      opacity: "0.8 to 1.0",
    },
    glow: {
      textShadow: "0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor",
      filter: "drop-shadow(0 0 8px currentColor)",
    },
    rgb: {
      background: "linear-gradient(45deg, hsl(280, 100%, 60%), hsl(160, 100%, 50%), hsl(320, 100%, 70%))",
      backgroundSize: "200% 200%",
      animation: "gradient-shift 2s ease infinite",
    }
  },

  // Animations (quick)
  animations: {
    fadeIn: "0.2s ease-out",
    slideIn: "0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    scale: "0.15s ease-out",
    flicker: "0.1s linear infinite alternate",
  },

  // Text Formatting Rules
  text: {
    maxCharsPerLine: 25,
    allowEmojis: true,
    transform: "uppercase",
    lineBreakStrategy: "aggressive", // Break early for impact
    
    // Generate text variations
    generateAlternatives: (text: string): string[] => {
      const lines = breakTextIntoLines(text, 25);
      return [
        lines.join('\n'), // Original
        lines.map(line => `⚡ ${line} ⚡`).join('\n'), // With lightning
        lines.map((line, i) => i % 2 === 0 ? `🔥 ${line}` : `${line} 💯`).join('\n'), // Mixed emojis
      ];
    }
  },

  // Timeline Effects
  timeline: {
    transitions: {
      cut: { duration: 0 }, // Instant cuts
      flash: { duration: 0.1, effect: "white-flash" },
      glitch: { duration: 0.2, effect: "digital-glitch" },
    },
    
    textAnimation: {
      typewriter: { speed: 0.05 }, // Fast typing
      slideIn: { direction: "left", duration: 0.3 },
      scaleIn: { scale: "0.5 to 1.2 to 1.0", duration: 0.4 },
    },

    overlay: {
      scanlines: true,
      flicker: { intensity: 0.3, frequency: 0.1 },
      chromaticAberration: { intensity: 0.2 },
    }
  }
};

// Utility function to break text into lines
function breakTextIntoLines(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxChars) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

export default rgbStyle;