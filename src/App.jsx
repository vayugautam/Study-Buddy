import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import { LoadingState } from "./components/UI";
import PublicHome from "./pages/PublicHome";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage from "./pages/ChatPage";
import ConversationsPage from "./pages/ConversationsPage";
import AccountPage from "./pages/AccountPage";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: { pathname: window.location.pathname } }} />;
}

function GuestRoute({ mode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  return user ? <Navigate to="/app" replace /> : <AuthPage mode={mode} />;
}

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/" element={<PublicHome />} />
    <Route path="/login" element={<GuestRoute mode="login" />} />
    <Route path="/register" element={<GuestRoute mode="register" />} />
    <Route element={<ProtectedRoute />}><Route path="/app" element={<AppShell />}>
      <Route index element={<DashboardPage />} />
      <Route path="documents" element={<DocumentsPage />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="conversations" element={<ConversationsPage />} />
      <Route path="account" element={<AccountPage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
