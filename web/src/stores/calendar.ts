import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalendarDay, CalendarEvent, CalendarStats, CalendarFilters } from "@/types/calendar";
import type { Ride } from "@/types/ride"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

interface CalendarState {
  events: CalendarEvent[];
  stats: CalendarStats | null;
  filters: CalendarFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCalendarEvents: (startDate: string, endDate: string) => Promise<void>;
  fetchCalendarStats: (startDate: string, endDate: string) => Promise<void>;
  createEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<CalendarEvent | null>;
  deleteEvent: (id: string) => Promise<boolean>;
  
  // Calendar utilities
  generateCalendarDays: (year: number, month: number) => CalendarDay[];
  getEventsForDate: (date: string) => CalendarEvent[];
  getUpcomingRides: (limit?: number) => Ride[];
  
  // Filters
  setFilters: (filters: CalendarFilters) => void;
  clearFilters: () => void;
  
  // Clear state
  clearError: () => void;
  clearCalendar: () => void;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      stats: null,
      filters: {},
      isLoading: false,
      error: null,

      async fetchCalendarEvents(startDate: string, endDate: string) {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams({
            startDate,
            endDate,
          });
          
          const res = await fetch(`${API_BASE}/calendar/events?${params}`, {
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to fetch calendar events: ${res.statusText}`);
          }
          
          const events: CalendarEvent[] = await res.json();
          set({ events, isLoading: false });
        } catch (error) {
          console.error("[calendar] fetchCalendarEvents failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch calendar events",
            isLoading: false 
          });
        }
      },

      async fetchCalendarStats(startDate: string, endDate: string) {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams({
            startDate,
            endDate,
          });
          
          const res = await fetch(`${API_BASE}/calendar/stats?${params}`, {
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to fetch calendar stats: ${res.statusText}`);
          }
          
          const stats: CalendarStats = await res.json();
          set({ stats, isLoading: false });
        } catch (error) {
          console.error("[calendar] fetchCalendarStats failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch calendar stats",
            isLoading: false 
          });
        }
      },

      async createEvent(eventData: Omit<CalendarEvent, "id">) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/calendar/events`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(eventData),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to create event: ${res.statusText}`);
          }
          
          const newEvent: CalendarEvent = await res.json();
          const { events } = get();
          set({ 
            events: [newEvent, ...events],
            isLoading: false 
          });
          
          return newEvent;
        } catch (error) {
          console.error("[calendar] createEvent failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to create event",
            isLoading: false 
          });
          return null;
        }
      },

      async updateEvent(id: string, updates: Partial<CalendarEvent>) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/calendar/events/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(updates),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to update event: ${res.statusText}`);
          }
          
          const updatedEvent: CalendarEvent = await res.json();
          const { events } = get();
          const updatedEvents = events.map(e => e.id === id ? updatedEvent : e);
          set({ 
            events: updatedEvents,
            isLoading: false 
          });
          
          return updatedEvent;
        } catch (error) {
          console.error("[calendar] updateEvent failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to update event",
            isLoading: false 
          });
          return null;
        }
      },

      async deleteEvent(id: string) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/calendar/events/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to delete event: ${res.statusText}`);
          }
          
          const { events } = get();
          const updatedEvents = events.filter(e => e.id !== id);
          set({ 
            events: updatedEvents,
            isLoading: false 
          });
          
          return true;
        } catch (error) {
          console.error("[calendar] deleteEvent failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to delete event",
            isLoading: false 
          });
          return false;
        }
      },

      generateCalendarDays(year: number, month: number): CalendarDay[] {
        const { events } = get();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        
        const calendarDays: CalendarDay[] = [];
        
        // Previous month days
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
          calendarDays.push({
            day: daysInPrevMonth - i,
            isCurrentMonth: false,
            isToday: false,
            hasRides: false,
          });
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateString = date.toISOString().split('T')[0];
          const dayEvents = events.filter(event => 
            event.start.startsWith(dateString)
          );
          
          calendarDays.push({
            day,
            isCurrentMonth: true,
            isToday: date.toDateString() === today.toDateString(),
            hasRides: dayEvents.length > 0,
            rides: dayEvents.filter(e => e.type === 'ride').map(e => e.ride).filter(Boolean) as Ride[],
          });
        }
        
        // Next month days to fill the grid
        const remainingDays = 42 - calendarDays.length;
        for (let day = 1; day <= remainingDays; day++) {
          calendarDays.push({
            day,
            isCurrentMonth: false,
            isToday: false,
            hasRides: false,
          });
        }
        
        return calendarDays;
      },

      getEventsForDate(date: string) {
        const { events } = get();
        return events.filter(event => event.start.startsWith(date));
      },

      getUpcomingRides(limit = 10) {
        const { events } = get();
        const now = new Date();
        
        return events
          .filter(event => 
            event.type === 'ride' && 
            event.ride && 
            new Date(event.start) > now
          )
          .map(event => event.ride!)
          .slice(0, limit);
      },

      setFilters(filters: CalendarFilters) {
        set({ filters });
      },

      clearFilters() {
        set({ filters: {} });
      },

      clearError() {
        set({ error: null });
      },

      clearCalendar() {
        set({ events: [], stats: null, error: null });
      },
    }),
    {
      name: "calendar-storage",
      partialize: (state) => ({
        events: state.events,
        stats: state.stats,
        filters: state.filters,
      }),
    }
  )
);
