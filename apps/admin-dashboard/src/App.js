import { useEffect } from 'react';
import AppRoutes from "./route";
import { DarkModeProvider } from './context/DarkModeContext';
import { injectNavigate } from './utils/api';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    injectNavigate(navigate);
  }, [navigate]);

  return (
    <div className="App">
      <DarkModeProvider>
        <AppRoutes />
      </DarkModeProvider>
    </div>
  );
}

export default App;
