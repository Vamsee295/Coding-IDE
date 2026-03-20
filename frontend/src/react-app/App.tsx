import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import HomePage from "@/react-app/pages/Home";
import { SettingsProvider } from "@/react-app/contexts/SettingsContext";
import { IdeCommandProvider } from "@/react-app/contexts/IdeCommandContext";
import { ExtensionProvider } from "@/react-app/contexts/ExtensionContext";
import { StatusBarProvider } from "@/react-app/contexts/StatusBarContext";

export default function App() {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("[Global Error Handled]:", event.error || event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[Unhandled Promise Rejection]:", event.reason);
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <SettingsProvider>
      <ExtensionProvider>
        <IdeCommandProvider>
          <StatusBarProvider>
            <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </Router>
          </StatusBarProvider>
        </IdeCommandProvider>
      </ExtensionProvider>
    </SettingsProvider>
  );
}
