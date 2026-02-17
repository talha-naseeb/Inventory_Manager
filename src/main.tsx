import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { dbService } from "./services/database";
import { MOCK_PRODUCTS } from "./services/mockData";

// Initialize and Seed Database
dbService
  .seed(MOCK_PRODUCTS)
  .catch((err) => {
    console.error("Database seeding skipped or failed:", err);
  })
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
