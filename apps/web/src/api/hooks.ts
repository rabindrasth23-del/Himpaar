// TanStack Query hooks over the API interface. Screens use these, never fetch directly.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateApiKeyInput,
  CreatePaymentLinkRequest,
  CreateWebhookEndpointInput,
  KycInput,
  LoginInput,
  SignupInput,
  SimulateInput,
} from "@himpaar/shared";
import { useApi } from "./index.ts";

export const qk = {
  session: ["session"] as const,
  links: ["payment-links"] as const,
  link: (id: string) => ["payment-links", id] as const,
  payments: ["payments"] as const,
  payment: (id: string) => ["payments", id] as const,
  settlements: ["settlements"] as const,
  settlement: (id: string) => ["settlements", id] as const,
  documents: ["documents"] as const,
  document: (id: string) => ["documents", id] as const,
  apiKeys: ["api-keys"] as const,
  endpoints: ["webhook-endpoints"] as const,
  deliveries: ["webhook-deliveries"] as const,
  publicLink: (token: string) => ["public-link", token] as const,
};

/* ── Session ─────────────────────────────────────────────────── */
export function useSession() {
  const api = useApi();
  return useQuery({ queryKey: qk.session, queryFn: () => api.getSession(), staleTime: Infinity, retry: false });
}

export function useLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: (s) => qc.setQueryData(qk.session, s),
  });
}

export function useSignup() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) => api.signup(input),
    onSuccess: (s) => qc.setQueryData(qk.session, s),
  });
}

export function useLogout() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(qk.session, null);
    },
  });
}

export function useSubmitKyc() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: KycInput) => api.submitKyc(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.session }),
  });
}

/* ── Lists and details ───────────────────────────────────────── */
export const usePaymentLinks = () => {
  const api = useApi();
  return useQuery({ queryKey: qk.links, queryFn: () => api.listPaymentLinks() });
};
export const usePaymentLink = (id: string) => {
  const api = useApi();
  return useQuery({ queryKey: qk.link(id), queryFn: () => api.getPaymentLink(id) });
};
export const usePayments = () => {
  const api = useApi();
  return useQuery({ queryKey: qk.payments, queryFn: () => api.listPayments() });
};
export const usePayment = (id: string) => {
  const api = useApi();
  return useQuery({ queryKey: qk.payment(id), queryFn: () => api.getPayment(id) });
};
export const useSettlements = () => {
  const api = useApi();
  return useQuery({ queryKey: qk.settlements, queryFn: () => api.listSettlements() });
};
export const useSettlement = (id: string) => {
  const api = useApi();
  return useQuery({ queryKey: qk.settlement(id), queryFn: () => api.getSettlement(id) });
};
export const useDocuments = () => {
  const api = useApi();
  return useQuery({ queryKey: qk.documents, queryFn: () => api.listDocuments() });
};
export const useDocument = (id: string) => {
  const api = useApi();
  return useQuery({ queryKey: qk.document(id), queryFn: () => api.getDocument(id) });
};
export const useApiKeys = () => {
  const api = useApi();
  return useQuery({ queryKey: qk.apiKeys, queryFn: () => api.listApiKeys() });
};
export const useWebhookEndpoints = () => {
  const api = useApi();
  return useQuery({ queryKey: qk.endpoints, queryFn: () => api.listWebhookEndpoints() });
};
export const useWebhookDeliveries = () => {
  const api = useApi();
  return useQuery({ queryKey: qk.deliveries, queryFn: () => api.listWebhookDeliveries() });
};
export const usePublicPaymentLink = (token: string) => {
  const api = useApi();
  return useQuery({ queryKey: qk.publicLink(token), queryFn: () => api.getPublicPaymentLink(token), retry: false });
};

/* ── Mutations ───────────────────────────────────────────────── */
/** Invalidate everything money-related after a state change. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [qk.links, qk.payments, qk.settlements, qk.documents, qk.deliveries].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
}

export function useCreatePaymentLink() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreatePaymentLinkRequest; idempotencyKey: string }) =>
      api.createPaymentLink(input, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.links }),
  });
}

export function useCreateApiKey() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApiKeyInput) => api.createApiKey(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apiKeys }),
  });
}

export function useRevokeApiKey() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apiKeys }),
  });
}

export function useCreateWebhookEndpoint() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWebhookEndpointInput) => api.createWebhookEndpoint(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.endpoints }),
  });
}

export function useDeleteWebhookEndpoint() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWebhookEndpoint(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.endpoints }),
  });
}

export function useRedeliverWebhook() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.redeliverWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.deliveries }),
  });
}

export function useSimulatePayment(token: string) {
  const api = useApi();
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ input, eventId }: { input: SimulateInput; eventId: string }) =>
      api.simulatePayment(token, input, eventId),
    onSuccess: () => invalidate(),
  });
}

export function useSandboxCompletePending() {
  const api = useApi();
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => api.sandboxCompletePending(id), onSuccess: () => invalidate() });
}

export function useSandboxAdvanceSettlement() {
  const api = useApi();
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: (id: string) => api.sandboxAdvanceSettlement(id), onSuccess: () => invalidate() });
}

export function useSandboxReplayWebhook() {
  const api = useApi();
  return useMutation({ mutationFn: (id: string) => api.sandboxReplayWebhook(id) });
}
