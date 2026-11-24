// Neutral tile shown where the prototype had an <image-slot> or a missing photo.
export default function Placeholder({ label, round }: { label: string; round?: boolean }) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 12,
        borderRadius: round ? "50%" : undefined,
        background: "repeating-linear-gradient(135deg, rgba(127,120,105,.10) 0 10px, rgba(127,120,105,.04) 10px 20px)",
        color: "rgba(95,91,82,.85)",
        font: "500 13px/1.35 var(--ff-anek), system-ui, sans-serif",
      }}
    >
      <span>{label}</span>
    </div>
  );
}
