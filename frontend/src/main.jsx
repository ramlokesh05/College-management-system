import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <MotionConfig reducedMotion="user">
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "0.85rem",
              background: "#0f172a",
              color: "#e2e8f0",
            },
          }}
        />
      </MotionConfig>
    </AuthProvider>
  </StrictMode>,
);
