// pages/NotFound.jsx
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

export default function NotFound({ darkMode = false }) {
  const { user, runner, isAuthenticated } = useSelector((state) => state.auth);

  // Determine home path based on user type
  const getHomePath = () => {
    if (isAuthenticated && runner) return '/raw';
    if (isAuthenticated && user) return '/welcome';
    return '/';
  };

  const homePath = getHomePath();
  const buttonText = isAuthenticated ? (runner ? 'Back to home' : 'Back to home') : 'Go Back Home';

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-5 text-center ${darkMode ? 'bg-black-100' : 'bg-gray-100'}`}>
      <div className={`rounded-2xl p-[60px_40px] max-w-[500px] w-full shadow-lg ${darkMode ? 'bg-black-200' : 'bg-white'}`}>
        <h1 className="text-[120px] font-bold text-primary m-0 leading-none tracking-[-4px]">
          404
        </h1>
        
        <div className="w-[60px] h-1 bg-primary mx-auto my-5 rounded"></div>
        
        <h2 className={`text-[28px] font-semibold mt-5 mb-3 ${darkMode ? 'text-gray-100' : 'text-secondary'}`}>
          Page Not Found
        </h2>
        
        <p className={`text-base mb-[30px] leading-relaxed ${darkMode ? 'text-gray-600' : 'text-gray-800'}`}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link 
          to={homePath}
          className="inline-block bg-primary text-white px-10 py-[14px] rounded-lg font-semibold text-base transition-all duration-300 hover:bg-[#e06e1a] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(244,124,32,0.3)]"
        >
          {buttonText}
        </Link>
      </div>
    </div>
  );
}