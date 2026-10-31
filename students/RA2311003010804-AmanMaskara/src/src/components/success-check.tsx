/** Animated tick for completed actions. The stroke draws in; reduced-motion users see it instantly. */
export function SuccessCheck({ className = "size-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true" className={`success-check text-success ${className}`}>
      <circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="success-check-circle"
      />
      <path
        d="M15 27 l7 7 l15 -15"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="success-check-mark"
      />
    </svg>
  );
}
