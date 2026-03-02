import { BrowserRouter as Router, Routes, Route } from "react-router";
import HomePage from "@/react-app/pages/Home";
import { SettingsProvider } from "@/react-app/contexts/SettingsContext";
import { IdeCommandProvider } from "@/react-app/contexts/IdeCommandContext";
import { ExtensionProvider } from "@/react-app/contexts/ExtensionContext";

export default function App() {
  return (
    <SettingsProvider>
      <ExtensionProvider>
        <IdeCommandProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </Router>
        </IdeCommandProvider>
      </ExtensionProvider>
    </SettingsProvider>
  );
}
