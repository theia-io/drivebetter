import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Ride, CreateRideRequest, UpdateRideRequest } from "@/types/ride";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

interface RidesState {
  rides: Ride[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchRides: () => Promise<void>;
  fetchRide: (id: string) => Promise<Ride | null>;
  createRide: (ride: CreateRideRequest) => Promise<Ride | null>;
  updateRide: (id: string, updates: UpdateRideRequest) => Promise<Ride | null>;
  deleteRide: (id: string) => Promise<boolean>;
  
  // Filtering and search
  searchRides: (query: string) => Ride[];
  filterRidesByStatus: (status: string) => Ride[];
  filterRidesByDate: (startDate: string, endDate: string) => Ride[];
  
  // Clear state
  clearError: () => void;
  clearRides: () => void;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const useRidesStore = create<RidesState>()(
  persist(
    (set, get) => ({
      rides: [],
      isLoading: false,
      error: null,

      async fetchRides() {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/rides`, {
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to fetch rides: ${res.statusText}`);
          }
          
          const rides: Ride[] = await res.json();
          set({ rides, isLoading: false });
        } catch (error) {
          console.error("[rides] fetchRides failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch rides",
            isLoading: false 
          });
        }
      },

      async fetchRide(id: string) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/rides/${id}`, {
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to fetch ride: ${res.statusText}`);
          }
          
          const ride: Ride = await res.json();
          set({ isLoading: false });
          
          // Update the ride in the list if it exists
          const { rides } = get();
          const updatedRides = rides.map(r => r.id === id ? ride : r);
          set({ rides: updatedRides });
          
          return ride;
        } catch (error) {
          console.error("[rides] fetchRide failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch ride",
            isLoading: false 
          });
          return null;
        }
      },

      async createRide(rideData: CreateRideRequest) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/rides`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(rideData),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to create ride: ${res.statusText}`);
          }
          
          const newRide: Ride = await res.json();
          const { rides } = get();
          set({ 
            rides: [newRide, ...rides],
            isLoading: false 
          });
          
          return newRide;
        } catch (error) {
          console.error("[rides] createRide failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to create ride",
            isLoading: false 
          });
          return null;
        }
      },

      async updateRide(id: string, updates: UpdateRideRequest) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/rides/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(updates),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to update ride: ${res.statusText}`);
          }
          
          const updatedRide: Ride = await res.json();
          const { rides } = get();
          const updatedRides = rides.map(r => r.id === id ? updatedRide : r);
          set({ 
            rides: updatedRides,
            isLoading: false 
          });
          
          return updatedRide;
        } catch (error) {
          console.error("[rides] updateRide failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to update ride",
            isLoading: false 
          });
          return null;
        }
      },

      async deleteRide(id: string) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/rides/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to delete ride: ${res.statusText}`);
          }
          
          const { rides } = get();
          const updatedRides = rides.filter(r => r.id !== id);
          set({ 
            rides: updatedRides,
            isLoading: false 
          });
          
          return true;
        } catch (error) {
          console.error("[rides] deleteRide failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to delete ride",
            isLoading: false 
          });
          return false;
        }
      },

      searchRides(query: string) {
        const { rides } = get();
        if (!query.trim()) return rides;
        
        const lowercaseQuery = query.toLowerCase();
        return rides.filter(ride => 
          ride.passenger?.toLowerCase().includes(lowercaseQuery) ||
          ride.from.toLowerCase().includes(lowercaseQuery) ||
          ride.to.toLowerCase().includes(lowercaseQuery) ||
          ride.notes?.toLowerCase().includes(lowercaseQuery)
        );
      },

      filterRidesByStatus(status: string) {
        const { rides } = get();
        return rides.filter(ride => ride.status === status);
      },

      filterRidesByDate(startDate: string, endDate: string) {
        const { rides } = get();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return rides.filter(ride => {
          const rideDate = new Date(ride.datetime);
          return rideDate >= start && rideDate <= end;
        });
      },

      clearError() {
        set({ error: null });
      },

      clearRides() {
        set({ rides: [], error: null });
      },
    }),
    {
      name: "rides-storage",
      partialize: (state) => ({
        rides: state.rides,
      }),
    }
  )
);
