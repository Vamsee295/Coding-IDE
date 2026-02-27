import { BrowserRouter as Router, Routes, Route } from "react-router";
import HomePage from "@/react-app/pages/Home";
import { SettingsProvider } from "@/react-app/contexts/SettingsContext";
import { IdeCommandProvider } from "@/react-app/contexts/IdeCommandContext";

export default function App() {
  return (
    <SettingsProvider>
      <IdeCommandProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Router>
      </IdeCommandProvider>
    </SettingsProvider>
  );
}
