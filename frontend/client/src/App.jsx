import "./css/App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import AnnotatePage from "./pages/AnnotatePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ChangePwd from "./pages/ChangePwd.jsx";
import ResetPwd from "./pages/ResetPwd.jsx";
import RebindPage from "./pages/RebindPage.jsx";

function App() {
    return (<Router>
                <Routes>
                  <Route path="/" element={<LoginPage />} />
                  <Route path="/homepage" element={<HomePage />} />
                  <Route path="/record" element={<HistoryPage />} />
                  <Route path="/annotate" element={<AnnotatePage />} />
                  <Route path="/change_password" element={<ChangePwd />} />
                  <Route path="/reset_password" element={<ResetPwd />} />
                  <Route path="/rebindpage" element={<RebindPage />} />
                </Routes>
            </Router>);
}

export default App;