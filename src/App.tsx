import { useEffect, useState } from "react";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { Layout } from "./components/layout/Layout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { POS } from "./pages/POS.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Login } from "./pages/auth/Login.tsx";
import { SalesHistory } from "./pages/SalesHistory.tsx";
import { Inventory } from "./pages/Inventory.tsx";

import { useAuthStore } from "./store/useAuthStore";
import { syncService } from "./services/syncService";

function App() {
  const { isAuthenticated } = useAuthStore();
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    syncService.start();
    return () => syncService.stop();
  }, []);

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
      case "inventory":
        return <Inventory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      {!isAuthenticated ? (
        <Login />
      ) : (
        <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
          {renderPage()}
        </Layout>
      )}
    </ThemeProvider>
  );
}

export default App;
