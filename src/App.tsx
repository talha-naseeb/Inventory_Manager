import { useState, useEffect } from "react";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { Layout } from "./components/layout/Layout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { POS } from "./pages/POS.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Login } from "./pages/auth/Login.tsx";
import { SalesHistory } from "./pages/SalesHistory.tsx";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  // Load persistence from localStorage for auth (mock)
  useEffect(() => {
    const savedAuth = localStorage.getItem("isAuthenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem("isAuthenticated", "true");
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      setIsAuthenticated(false);
      localStorage.removeItem("isAuthenticated");
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "pos":
        return <POS />;
      case "settings":
        return <Settings />;
      case "sales-history":
        return <SalesHistory onPageChange={setCurrentPage} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Layout onLogout={handleLogout} currentPage={currentPage} onPageChange={setCurrentPage}>
          {renderPage()}
        </Layout>
      )}
    </ThemeProvider>
  );
}

export default App;
