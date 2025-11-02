import { cn } from "@/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn("w-8 h-8", className)}
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      <rect
        x="10" y="10" width="80" height="80" rx="10"
        fill="hsla(var(--primary), 0.05)"
        stroke="hsla(var(--primary), 0.2)"
        strokeWidth="1"
      />
      
      <circle cx="50" cy="50" r="30" fill="url(#glow)" />

      <path
        d="M70,30 C60,20 40,20 30,30 C20,40 20,60 30,70 C40,80 60,80 70,70"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
