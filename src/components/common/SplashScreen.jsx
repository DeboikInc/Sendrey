import Logo from "../../assets/Sendrey-Logo-Variants-09.png";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-[99999]">
      <img src={Logo} alt="Sendrey" className="w-28 h-28 object-contain" />
    </div>
  );
}