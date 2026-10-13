import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardLayout } from "./layouts/dashboard-layout.tsx";
import { AuthLayout } from "./layouts/auth-layout.tsx";
import { LandingPage } from "./pages/landing.tsx";
import { LoginPage } from "./pages/auth/login.tsx";
import { SignupPage } from "./pages/auth/signup.tsx";
import { OverviewPage } from "./pages/dashboard/overview.tsx";
import { PaymentLinksPage } from "./pages/dashboard/payment-links.tsx";
import { PaymentsPage } from "./pages/dashboard/payments.tsx";
import { SettlementsPage } from "./pages/dashboard/settlements.tsx";
import { ApiKeysPage } from "./pages/dashboard/api-keys.tsx";
import { SettingsPage } from "./pages/dashboard/settings.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="payment-links" element={<PaymentLinksPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="settlements" element={<SettlementsPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
