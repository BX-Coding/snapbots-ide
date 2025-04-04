import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type SnapbotModeContextType = {
  mode: string;
  setMode: (mode: string) => void;
};

const SnapbotModeContext = createContext<SnapbotModeContextType | undefined>(undefined);

type SnapbotModeProviderProps = {
  children: ReactNode;
};

export const SnapbotModeProvider = ({ children }: SnapbotModeProviderProps) => {
  const [mode, setMode] = useState<string>('simulation');

  useEffect(() => {
    // Load saved mode from localStorage on component mount
    const savedMode = localStorage.getItem('snapbotMode');
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  const handleSetMode = (newMode: string) => {
    setMode(newMode);
    localStorage.setItem('snapbotMode', newMode);
  };

  return (
    <SnapbotModeContext.Provider value={{ mode, setMode: handleSetMode }}>
      {children}
    </SnapbotModeContext.Provider>
  );
};

export const useSnapbotMode = (): SnapbotModeContextType => {
  const context = useContext(SnapbotModeContext);
  if (context === undefined) {
    throw new Error('useSnapbotMode must be used within a SnapbotModeProvider');
  }
  return context;
}; 