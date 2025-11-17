import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  animate?: boolean;
}

const particles = [
  { color: "hsl(var(--codex-blue))", delay: "0s", tx: "40px", ty: "-30px" },
  { color: "hsl(var(--codex-cyan))", delay: "0.5s", tx: "-35px", ty: "-25px" },
  { color: "hsl(var(--codex-mint))", delay: "1s", tx: "30px", ty: "35px" },
  { color: "hsl(var(--codex-blue))", delay: "1.5s", tx: "-40px", ty: "30px" },
  { color: "hsl(var(--codex-cyan))", delay: "2s", tx: "0px", ty: "-45px" },
  { color: "hsl(var(--codex-mint))", delay: "2.5s", tx: "45px", ty: "0px" },
];

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  showPercentage = true,
  animate = false,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Animated particles */}
      {animate && (
        <div className="absolute inset-0 flex items-center justify-center">
          {particles.map((particle, index) => (
            <div
              key={index}
              className="absolute w-2 h-2 rounded-full animate-[particle-float_3s_ease-in-out_infinite]"
              style={{
                backgroundColor: particle.color,
                animationDelay: particle.delay,
                "--tx": particle.tx,
                "--ty": particle.ty,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
      
      <svg
        width={size}
        height={size}
        className={cn("transform -rotate-90 relative z-10", animate && "animate-[spin-slow_3s_linear_infinite]")}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--codex-blue))" />
            <stop offset="50%" stopColor="hsl(var(--codex-cyan))" />
            <stop offset="100%" stopColor="hsl(var(--codex-mint))" />
          </linearGradient>
        </defs>
        
        {/* Progress circle with gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className="text-3xl font-bold bg-gradient-codex bg-clip-text text-transparent">
            {Math.round(value)}%
          </span>
        </div>
      )}
    </div>
  );
}
