import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import LoginPage from "./pages/LoginPage";
import AuctionsPage from "./pages/AuctionsPage";
import AuctionDetailPage from "./pages/AuctionDetailPage";
import RequireAdmin from "./RequireAdmin";
import AdminDashboard from "./pages/AdminDashboard";
import CreateAuctionPage from "./pages/CreateAuctionPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/auctions/new" element={<RequireAdmin><CreateAuctionPage /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/auctions" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}