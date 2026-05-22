import { useEffect, useState } from "react";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { Layout } from "./components/layout/Layout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { POS } from "./pages/POS.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Login } from "./pages/auth/Login.tsx";
import { SalesHistory } from "./pages/SalesHistory.tsx";
import { Inventory } from "./pages/Inventory.tsx";
import { Reports } from "./pages/Reports.tsx";
import Customers from "./pages/Customers.tsx";

import { useAuthStore } from "./store/useAuthStore";
import { syncService } from "./services/syncService";
import { UpdateBanner } from "./components/layout/UpdateBanner";
import { SubscriptionBanner } from "./components/layout/SubscriptionBanner";

function App() {
  const { isAuthenticated } = useAuthStore();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [pageParams, setPageParams] = useState<any>(null);

  useEffect(() => {
    syncService.start();
    return () => syncService.stop();
  }, []);

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    setPageParams(params);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "pos":
        return <POS />;
      case "settings":
        return <Settings initialTab={pageParams?.activeTab} />;
      case "sales-history":
        return <SalesHistory onPageChange={setCurrentPage} />;
      case "inventory":
        return <Inventory />;
      case "reports":
        return <Reports />;
      case "customers":
        return <Customers />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <ThemeProvider>
      <UpdateBanner />
      <SubscriptionBanner />
      {!isAuthenticated ? (
        <Login />
      ) : (
        <Layout currentPage={currentPage} onPageChange={handleNavigate}>
          {renderPage()}
        </Layout>
      )}
    </ThemeProvider>
  );
}

export default App;
