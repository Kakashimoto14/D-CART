import fullLogo from "../../assets/brand/dcart-logo.svg";
import iconLogo from "../../assets/brand/dcart-icon.svg";

export function BrandLogo({ variant = "full", className = "", imageClassName = "" }) {
  const source = variant === "icon" ? iconLogo : fullLogo;
  const label = variant === "icon" ? "D'Cart icon" : "D'Cart logo";

  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src={source}
        alt={label}
        className={`block h-auto max-w-full object-contain ${imageClassName}`}
        draggable="false"
      />
    </span>
  );
}
