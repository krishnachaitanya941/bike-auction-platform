import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import ErrorBoundary from "./ErrorBoundary";
import RequireAdmin from "./RequireAdmin";
import { TopNav } from "./ui";
import LoginPage from "./pages/LoginPage";
import AuctionsPage from "./pages/AuctionsPage";
import AuctionDetailPage from "./pages/AuctionDetailPage";
import AdminDashboard from "./pages/AdminDashboard";
import CreateAuctionPage from "./pages/CreateAuctionPage";

function NotFound() {
  return (
    <div className="app-page">
      <TopNav active="" />
      <main className="page-container" style={{ textAlign: "center", padding: "96px 0" }}>
        <div className="page-title">Page not found</div>
        <p style={{ color: "var(--muted)", margin: "12px 0 24px" }}>
          The page you are looking for does not exist or has moved.
        </p>
        <Link to="/auctions" className="btn btn-primary">Browse auctions</Link>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auctions" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/auctions/:id" element={<AuctionDetailPage />} />
            <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/auctions/new" element={<RequireAdmin><CreateAuctionPage /></RequireAdmin>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}