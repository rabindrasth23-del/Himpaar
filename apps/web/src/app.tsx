import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
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
import { DevelopersPage } from "./pages/dashboard/developers.tsx";
import { DocumentsPage } from "./pages/dashboard/documents.tsx";
import { SandboxPage } from "./pages/dashboard/sandbox.tsx";
import { RoadmapPage } from "./pages/dashboard/roadmap.tsx";
import { PayerPage } from "./pages/payer.tsx";
import { ApiContext, createApi } from "./api/index.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  const api = useMemo(() => createApi(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={api}>
        <BrowserRouter>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public payer page */}
            <Route path="/pay/:token" element={<PayerPage />} />

            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Dashboard routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="payment-links" element={<PaymentLinksPage />} />
              <Route path="links" element={<PaymentLinksPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="settlements" element={<SettlementsPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="developers" element={<DevelopersPage />} />
              <Route path="sandbox" element={<SandboxPage />} />
              <Route path="roadmap" element={<RoadmapPage />} />
              <Route path="api-keys" element={<ApiKeysPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ApiContext.Provider>
    </QueryClientProvider>
  );
}
