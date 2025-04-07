import React, { createContext, useContext, useEffect, useState } from 'react';

const themes = {
  light: 'light',
  dark: 'dark',
  forest: 'forest',
  ocean: 'ocean',
  sunset: 'sunset',
  lavender: 'lavender'
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem('theme');
    return storedTheme || themes.light;
  });

  useEffect(() => {
    // Update localStorage and document class when theme changes
    localStorage.setItem('theme', theme);
    
    // Remove all theme classes
    Object.values(themes).forEach(t => {
      document.documentElement.classList.remove(t);
    });
    
    // Add current theme class
    document.documentElement.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 