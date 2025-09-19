export type RideType = "reservation" | "asap";
export type RideStatus = "unassigned" | "assigned" | "on_my_way" | "on_location" | "pob" | "clear" | "completed";
export type PaymentMethod = "cash" | "zelle" | "card" | "qr";

export interface Ride {
  id: string;
  creatorId?: string | null;
  clientId?: string | null;
  from: string;
  to: string;
  stops?: string[];
  datetime: string;
  type: RideType;
  queue: string[];
  assignedDriverId?: string | null;
  coveredVisible: boolean;
  status: RideStatus;
  notes?: string;
  payment?: {
    method?: PaymentMethod;
    paid?: boolean;
    driverPaid?: boolean;
  };
  // Additional fields from UI mocks
  passenger?: string;
  rating?: number | null;
  fare?: number;
  distance?: number;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRideRequest {
  from: string;
  to: string;
  stops?: string[];
  datetime: string;
  type: RideType;
  notes?: string;
  payment?: {
    method?: PaymentMethod;
  };
}

export interface UpdateRideRequest {
  status?: RideStatus;
  notes?: string;
  payment?: {
    method?: PaymentMethod;
    paid?: boolean;
    driverPaid?: boolean;
  };
  rating?: number;
}
