// src/components/kyc/DocumentTag.jsx
export default function DocumentTag({ label }) {
  return (
    <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-wide">
      {label}
    </span>
  );
}