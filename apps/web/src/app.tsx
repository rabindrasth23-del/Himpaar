import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import { DashboardLayout, RequireSession } from "./layouts/dashboard-layout.tsx";
import { AuthLayout } from "./layouts/auth-layout.tsx";
import { LandingPage } from "./pages/landing.tsx";
import { LoginPage } from "./pages/auth/login.tsx";
import { SignupPage } from "./pages/auth/signup.tsx";
import { OverviewPage } from "./pages/dashboard/overview.tsx";
import { PaymentLinksPage } from "./pages/dashboard/payment-links.tsx";
import { PaymentLinkDetailPage } from "./pages/dashboard/payment-link-detail.tsx";
import { PaymentsPage } from "./pages/dashboard/payments.tsx";
import { PaymentDetailPage } from "./pages/dashboard/payment-detail.tsx";
import { SettlementsPage } from "./pages/dashboard/settlements.tsx";
import { SettlementDetailPage } from "./pages/dashboard/settlement-detail.tsx";
import { SettingsPage } from "./pages/dashboard/settings.tsx";
import { DevelopersPage } from "./pages/dashboard/developers.tsx";
import { DocumentsPage } from "./pages/dashboard/documents.tsx";
import { DocumentDetailPage } from "./pages/dashboard/document-detail.tsx";
import { SandboxPage } from "./pages/dashboard/sandbox.tsx";
import { RoadmapPage } from "./pages/dashboard/roadmap.tsx";
import { KycPage } from "./pages/dashboard/kyc.tsx";
import { PayerPage } from "./pages/payer.tsx";
import { ApiContext, createApi } from "./api/index.ts";
import { ToastProvider } from "./components/toast.tsx";

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
        <ToastProvider>
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

              {/* Dashboard routes (session required) */}
              <Route
                path="/dashboard"
                element={
                  <RequireSession>
                    <DashboardLayout />
                  </RequireSession>
                }
              >
                <Route index element={<OverviewPage />} />
                <Route path="links" element={<PaymentLinksPage />} />
                <Route path="links/:id" element={<PaymentLinkDetailPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="payments/:id" element={<PaymentDetailPage />} />
                <Route path="settlements" element={<SettlementsPage />} />
                <Route path="settlements/:id" element={<SettlementDetailPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="documents/:id" element={<DocumentDetailPage />} />
                <Route path="developers" element={<DevelopersPage />} />
                <Route path="sandbox" element={<SandboxPage />} />
                <Route path="roadmap" element={<RoadmapPage />} />
                <Route path="kyc" element={<KycPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {/* Old paths kept working */}
                <Route path="payment-links" element={<Navigate to="/dashboard/links" replace />} />
                <Route path="api-keys" element={<Navigate to="/dashboard/developers" replace />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ApiContext.Provider>
    </QueryClientProvider>
  );
}
