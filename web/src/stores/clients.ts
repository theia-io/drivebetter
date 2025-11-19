import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Client, CreateClientRequest, UpdateClientRequest } from "@/types/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

interface ClientsState {
    clients: Client[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchClients: () => Promise<void>;
    fetchClient: (id: string) => Promise<Client | null>;
    createClient: (client: CreateClientRequest) => Promise<Client | null>;
    updateClient: (id: string, updates: UpdateClientRequest) => Promise<Client | null>;
    deleteClient: (id: string) => Promise<boolean>;

    // Filtering and search
    searchClients: (query: string) => Client[];
    filterClientsByRating: (minRating: number) => Client[];
    filterClientsByRides: (minRides: number) => Client[];

    // Clear state
    clearError: () => void;
    clearClients: () => void;
}

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

export const useClientsStore = create<ClientsState>()(
    persist(
        (set, get) => ({
            clients: [],
            isLoading: false,
            error: null,

            async fetchClients() {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/clients`, {
                        headers: getAuthHeaders(),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to fetch clients: ${res.statusText}`);
                    }

                    const clients: Client[] = await res.json();
                    set({ clients, isLoading: false });
                } catch (error) {
                    console.error("[clients] fetchClients failed:", error);
                    set({
                        error: error instanceof Error ? error.message : "Failed to fetch clients",
                        isLoading: false,
                    });
                }
            },

            async fetchClient(id: string) {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/clients/${id}`, {
                        headers: getAuthHeaders(),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to fetch client: ${res.statusText}`);
                    }

                    const client: Client = await res.json();
                    set({ isLoading: false });

                    // Update the client in the list if it exists
                    const { clients } = get();
                    const updatedClients = clients.map((c) => (c.id === id ? client : c));
                    set({ clients: updatedClients });

                    return client;
                } catch (error) {
                    console.error("[clients] fetchClient failed:", error);
                    set({
                        error: error instanceof Error ? error.message : "Failed to fetch client",
                        isLoading: false,
                    });
                    return null;
                }
            },

            async createClient(clientData: CreateClientRequest) {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/clients`, {
                        method: "POST",
                        headers: getAuthHeaders(),
                        body: JSON.stringify(clientData),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to create client: ${res.statusText}`);
                    }

                    const newClient: Client = await res.json();
                    const { clients } = get();
                    set({
                        clients: [newClient, ...clients],
                        isLoading: false,
                    });

                    return newClient;
                } catch (error) {
                    console.error("[clients] createClient failed:", error);
                    set({
                        error: error instanceof Error ? error.message : "Failed to create client",
                        isLoading: false,
                    });
                    return null;
                }
            },

            async updateClient(id: string, updates: UpdateClientRequest) {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/clients/${id}`, {
                        method: "PATCH",
                        headers: getAuthHeaders(),
                        body: JSON.stringify(updates),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to update client: ${res.statusText}`);
                    }

                    const updatedClient: Client = await res.json();
                    const { clients } = get();
                    const updatedClients = clients.map((c) => (c.id === id ? updatedClient : c));
                    set({
                        clients: updatedClients,
                        isLoading: false,
                    });

                    return updatedClient;
                } catch (error) {
                    console.error("[clients] updateClient failed:", error);
                    set({
                        error: error instanceof Error ? error.message : "Failed to update client",
                        isLoading: false,
                    });
                    return null;
                }
            },

            async deleteClient(id: string) {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/clients/${id}`, {
                        method: "DELETE",
                        headers: getAuthHeaders(),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to delete client: ${res.statusText}`);
                    }

                    const { clients } = get();
                    const updatedClients = clients.filter((c) => c.id !== id);
                    set({
                        clients: updatedClients,
                        isLoading: false,
                    });

                    return true;
                } catch (error) {
                    console.error("[clients] deleteClient failed:", error);
                    set({
                        error: error instanceof Error ? error.message : "Failed to delete client",
                        isLoading: false,
                    });
                    return false;
                }
            },

            searchClients(query: string) {
                const { clients } = get();
                if (!query.trim()) return clients;

                const lowercaseQuery = query.toLowerCase();
                return clients.filter(
                    (client) =>
                        client.name.toLowerCase().includes(lowercaseQuery) ||
                        client.email?.toLowerCase().includes(lowercaseQuery) ||
                        client.phone.toLowerCase().includes(lowercaseQuery) ||
                        client.notes?.toLowerCase().includes(lowercaseQuery)
                );
            },

            filterClientsByRating(minRating: number) {
                const { clients } = get();
                return clients.filter(
                    (client) => client.averageRating && client.averageRating >= minRating
                );
            },

            filterClientsByRides(minRides: number) {
                const { clients } = get();
                return clients.filter(
                    (client) => client.totalRides && client.totalRides >= minRides
                );
            },

            clearError() {
                set({ error: null });
            },

            clearClients() {
                set({ clients: [], error: null });
            },
        }),
        {
            name: "clients-storage",
            partialize: (state) => ({
                clients: state.clients,
            }),
        }
    )
);
