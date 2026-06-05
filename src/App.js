import React from 'react';
import AppRoutes from "./route";
import { DarkModeProvider } from './context/DarkModeContext';

function App() {
  return (
    <div className="App">
      <DarkModeProvider>
        <AppRoutes />
      </DarkModeProvider>
    </div>
  );
}

export default App;
