// route.js
import { Routes, Route } from "react-router";
import WhatsAppLikeChat from "./pages/runner/Raw";
import { Home } from "./pages/user/Home";
import { Auth } from "./pages/user/Auth";
import { Welcome } from "./pages/user/Welcome";
import { Profile } from "./pages/runner/Profile"
import { Disputes } from "./pages/runner/Disputes";
import { Wallet } from "./pages/runner/Wallet";
import { Orders } from "./pages/runner/Orders";
import { Payout } from "./pages/runner/Payout";

import ProtectedRoute from "./components/common/ProtectedRoute";

export default function ProjectedRoutes() {
  return (
    <Routes>
      {/* Runner routes - require runner authentication */}
    
      <Route path="/profile" element={
        <ProtectedRoute requireRunner={true}>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/all-orders" element={
        <ProtectedRoute requireRunner={true}>
          <Orders />
        </ProtectedRoute>
      } />
      
      <Route path="/disputes" element={
        <ProtectedRoute requireRunner={true}>
          <Disputes />
        </ProtectedRoute>
      } />
      
      <Route path="/wallet" element={
        <ProtectedRoute requireRunner={true}>
          <Wallet />
        </ProtectedRoute>
      } />
      
      <Route path="/payout" element={
        <ProtectedRoute requireRunner={true}>
          <Payout />
        </ProtectedRoute>
      } />

      {/* User routes - require user authentication */}
      <Route path="/welcome" element={
        <ProtectedRoute requireRunner={false}>
          <Welcome />
        </ProtectedRoute>
      } />
      

      {/* Public routes - no authentication required */}
      <Route path="/" element={ <Home /> } />
      <Route path="/auth" element={<Auth />} />
      <Route path="/raw" element={ <WhatsAppLikeChat /> } />
    </Routes>
  );
}