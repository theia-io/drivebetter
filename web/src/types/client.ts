export interface Client {
    id: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    savedAddresses: string[];
    cardsOnFile: string[];
    // Additional fields from UI mocks
    preferences?: {
        paymentMethod?: "cash" | "card" | "zelle" | "qr";
        vehicleType?: "standard" | "premium" | "luxury";
        musicPreference?: string;
    };
    totalRides?: number;
    averageRating?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateClientRequest {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    savedAddresses?: string[];
    preferences?: {
        paymentMethod?: "cash" | "card" | "zelle" | "qr";
        vehicleType?: "standard" | "premium" | "luxury";
        musicPreference?: string;
    };
}

export interface UpdateClientRequest {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
    savedAddresses?: string[];
    cardsOnFile?: string[];
    preferences?: {
        paymentMethod?: "cash" | "card" | "zelle" | "qr";
        vehicleType?: "standard" | "premium" | "luxury";
        musicPreference?: string;
    };
}
