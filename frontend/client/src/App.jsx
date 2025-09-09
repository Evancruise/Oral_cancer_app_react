import "./css/App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import AnnotatePage from "./pages/AnnotatePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ChangePwd from "./pages/ChangePwd.jsx";
import ResetPwd from "./pages/ResetPwd.jsx";
import RebindPage from "./pages/RebindPage.jsx";
import HistoryManagePage from "./pages/HistoryManagePage.jsx";
import HistoryDiscardPage from "./pages/HistoryDiscardPage.jsx";
import AccountManagePage from "./pages/AccountManagePage.jsx";

function App() {
    return (<Router>
                <Routes>
                  <Route path="/" element={<LoginPage />} />
                  <Route path="/homepage" element={<HomePage />} />
                  <Route path="/record" element={<HistoryPage />} />
                  <Route path="/all_record" element={<HistoryManagePage />} />
                  <Route path="/all_account" element={<AccountManagePage />} />
                  <Route path="/cabin" element={<HistoryDiscardPage />} />
                  <Route path="/annotate" element={<AnnotatePage />} />
                  <Route path="/change_password" element={<ChangePwd />} />
                  <Route path="/reset_password" element={<ResetPwd />} />
                  <Route path="/rebindpage" element={<RebindPage />} />
                </Routes>
            </Router>);
}

export default App;