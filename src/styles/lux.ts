// Luxury Style Configuration
export const luxuryStyle = {
  id: "luxury",
  name: "Luxury",
  
  // Typography
  typography: {
    headline: {
      fontFamily: "Playfair Display, serif",
      fontWeight: "700",
      fontSize: "clamp(2.5rem, 8vw, 5rem)",
      lineHeight: "1.1",
      letterSpacing: "-0.01em",
      fontStyle: "normal",
    },
    body: {
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: "400", 
      fontSize: "clamp(1.125rem, 4vw, 1.75rem)",
      lineHeight: "1.4",
      letterSpacing: "0.005em",
    }
  },

  // Colors & Effects
  colors: {
    primary: "hsl(45, 85%, 65%)", // rich gold
    secondary: "hsl(35, 70%, 55%)", // warm bronze
    accent: "hsl(25, 60%, 45%)", // deep amber
    background: "hsl(220, 15%, 8%)", // sophisticated dark
    text: "hsl(45, 20%, 92%)", // warm white
  },

  // Visual Effects
  effects: {
    vignette: {
      background: "radial-gradient(circle at center, transparent 40%, hsl(220, 15%, 4%) 80%)",
      position: "absolute",
      inset: "0",
    },
    goldShimmer: {
      background: "linear-gradient(90deg, transparent, hsl(45, 85%, 65%) 50%, transparent)",
      animation: "shimmer 3s ease-in-out infinite",
    },
    elegantGlow: {
      textShadow: "0 2px 8px hsl(45, 85%, 65%, 0.3), 0 4px 16px hsl(45, 85%, 65%, 0.2)",
      filter: "drop-shadow(0 2px 4px hsl(45, 85%, 65%, 0.15))",
    }
  },

  // Animations (slower, elegant)
  animations: {
    fadeIn: "0.8s ease-out",
    slideIn: "1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    scale: "0.6s ease-out", 
    shimmer: "3s ease-in-out infinite",
  },

  // Text Formatting Rules
  text: {
    maxCharsPerLine: 25,
    allowEmojis: false,
    transform: "none", // Preserve original case
    lineBreakStrategy: "elegant", // Break at natural points
    
    // Generate text variations
    generateAlternatives: (text: string): string[] => {
      const lines = breakTextIntoLines(text, 25);
      return [
        lines.join('\n'), // Original
        lines.map(line => line.charAt(0).toUpperCase() + line.slice(1).toLowerCase()).join('\n'), // Title case
        lines.map((line, i) => i === 0 ? line.toUpperCase() : line).join('\n'), // First line caps
      ];
    }
  },

  // Timeline Effects  
  timeline: {
    transitions: {
      dissolve: { duration: 0.8, easing: "ease-in-out" },
      fade: { duration: 1.0, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" },
      wipe: { duration: 1.2, direction: "horizontal" },
    },
    
    textAnimation: {
      fadeIn: { opacity: "0 to 1", duration: 1.0 },
      slideUp: { direction: "bottom", distance: "30px", duration: 0.8 },
      typewriter: { speed: 0.08 }, // Slower, more deliberate
    },

    overlay: {
      vignette: { intensity: 0.4, feather: 0.6 },
      goldParticles: { count: 15, speed: 0.3, opacity: 0.2 },
      filmGrain: { intensity: 0.1, size: 1.2 },
    }
  }
};

// Utility function to break text into lines (elegant breaks)
function breakTextIntoLines(text: string, maxChars: number): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const lines: string[] = [];
  
  for (const sentence of sentences) {
    const words = sentence.trim().split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text.substring(0, maxChars)];
}

export default luxuryStyle;