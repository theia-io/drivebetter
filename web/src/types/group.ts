export type GroupType = "local" | "corporate" | "global";

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  members: string[];
  city?: string;
  // Additional fields from UI mocks
  description?: string;
  activeRides?: number;
  totalRides?: number;
  rating?: number;
  location?: string;
  created?: string;
  status?: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  type: GroupType;
  city?: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  type?: GroupType;
  city?: string;
  description?: string;
  members?: string[];
}

export interface GroupActivity {
  id: string;
  type: "join" | "ride" | "message" | "leave";
  user: string;
  group: string;
  time: string;
  description: string;
}
