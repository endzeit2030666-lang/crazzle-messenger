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
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#00E5FF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      <path
        d="M20,10 C10,10 10,20 10,20 V80 C10,90 20,90 20,90 H80 C90,90 90,80 90,80 V20 C90,10 80,10 80,10 H20 Z"
        fill="rgba(0, 229, 255, 0.05)"
        stroke="rgba(0, 229, 255, 0.2)"
        strokeWidth="1"
      />
      
      <path d="M25,15 V20" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
      <path d="M15,25 H20" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
      <path d="M80,15 H75" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
      <path d="M85,20 V25" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
      <path d="M20,85 H25" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
      <path d="M15,80 V75" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />

      <path d="M50,25 L50,35" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="1" />
      <path d="M50,65 L50,75" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="1" />
      <path d="M25,50 L35,50" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="1" />
      <path d="M65,50 L75,50" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="1" />
      <path d="M35,35 L45,45" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="1" />
      <path d="M55,55 L65,65" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="1" />

      <path
        d="M75,35 C85,45 85,55 75,65 L65,65 C70,55 70,45 65,35 L75,35"
        fill="transparent"
        stroke="rgba(0, 229, 255, 0)"
      />
      
      <circle cx="50" cy="50" r="28" fill="url(#glow)" />

      <path
        d="M70,30 C60,20 40,20 30,30 C20,40 20,60 30,70 C40,80 60,80 70,70"
        fill="none"
        stroke="#00E5FF"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
