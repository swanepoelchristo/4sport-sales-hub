import logoSrc from "@/assets/4sport-logo-cropped.png";

export function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 ${className}`}>
      <img
        src={logoSrc}
        alt="4SPORT — eyes on the game"
        className="h-full w-auto object-contain"
        draggable={false}
      />
    </div>
  );
}
