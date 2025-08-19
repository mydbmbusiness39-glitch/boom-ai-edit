import { cn } from "@/lib/utils";

interface WatermarkProps {
  className?: string;
}

const Watermark = ({ className }: WatermarkProps) => {
  return (
    <div className={cn(
      "absolute bottom-4 right-4 z-50",
      "bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2",
      "text-xs font-medium text-muted-foreground",
      "pointer-events-none select-none",
      className
    )}>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-gradient-to-r from-neon-purple to-neon-green rounded-full" />
        <span>BOOM! Free</span>
      </div>
    </div>
  );
};

export default Watermark;