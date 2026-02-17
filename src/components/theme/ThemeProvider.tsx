import React, { useEffect } from "react";
import { useThemeStore } from "../../store/useThemeStore";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDarkMode, primaryColor, accentColor, sidebarColor } = useThemeStore();

  useEffect(() => {
    // Update data-theme or class for dark mode
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.setProperty("color-scheme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.setProperty("color-scheme", "light");
    }

    // Inject CSS variables for primary, accent and sidebar colors
    const root = document.documentElement;
    root.style.setProperty("--primary-color", primaryColor);
    root.style.setProperty("--accent-color", accentColor);

    if (sidebarColor) {
      root.style.setProperty("--sidebar-bg", sidebarColor);
    } else {
      root.style.removeProperty("--sidebar-bg");
    }
  }, [isDarkMode, primaryColor, accentColor, sidebarColor]);

  return <>{children}</>;
};
