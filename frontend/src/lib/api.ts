import axios, { AxiosError, AxiosInstance, AxiosHeaders } from 'axios';


// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Parking {
  id: string;
  name: string;
  location?: string;
  address?: string;
  totalSpots: number;
  availableSpots?: number;
  pricePerHour?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * NOTE:
 * DB columns (from your screenshot):
 * id, spot_number (varchar), status (varchar), IsOccupied (bit), ParkingId (int)
 *
 * So we normalize to a stable frontend shape:
 * - SpotNumber string
 * - ParkingId string
 * - IsAvailable derived from status/IsOccupied
 */
export interface Spot {
  id: string;
  ParkingId: string;
  SpotNumber: string;
  IsAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Reservation {
  id: string;
  UserId?: string;
  ParkingId: string;
  SpotId: string;
  VehiclePlate: string;
  StartTime: string;
  EndTime: string;
  Status?: 'active' | 'completed' | 'cancelled' | 'pending';
  parking?: Parking;
  spot?: Spot;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalParkings: number;
  totalSpots: number;
  totalReservations: number;
  activeReservations: number;
}

type AnyRecord = Record<string, any>;

const normalizeUser = (input: AnyRecord): User => {
  const roleRaw = String(input?.role ?? input?.Role ?? '').toLowerCase().trim();
  const role =
    roleRaw === 'admin' || roleRaw === 'role_admin' || roleRaw.endsWith('admin')
      ? 'admin'
      : 'user';

  return {
    id: String(input?.id ?? input?.Id ?? input?.ID ?? ''),
    name: String(input?.name ?? input?.Name ?? ''),
    email: String(input?.email ?? input?.Email ?? ''),
    role,
  };
};

const normalizeAdminUser = (input: AnyRecord): AdminUser => ({
  id: String(input?.id ?? input?.Id ?? input?.ID ?? ''),
  name: String(input?.name ?? input?.Name ?? ''),
  email: String(input?.email ?? input?.Email ?? ''),
  role: (String(input?.role ?? input?.Role ?? '').toLowerCase().includes('admin') ? 'admin' : 'user') as
    | 'admin'
    | 'user',
  createdAt: input?.created_at ?? input?.createdAt ?? input?.CreatedAt,
});

const normalizeParking = (input: AnyRecord): Parking => {
  const totalSpots =
    input?.totalSpots ??
    input?.TotalSpots ??
    input?.total_spots ??
    input?.Capacity ??
    input?.capacity ??
    0;

  const availableSpots =
    input?.availableSpots ?? input?.AvailableSpots ?? input?.available_spots;

  const pricePerHour = input?.pricePerHour ?? input?.PricePerHour ?? input?.price_per_hour;
  const occupied = input?.Occupied ?? input?.occupied;

  const computedAvailable =
    availableSpots !== undefined
      ? Number(availableSpots)
      : totalSpots && occupied !== undefined
      ? Math.max(0, Number(totalSpots) - Number(occupied))
      : undefined;

  return {
    id: String(input?.id ?? input?.Id ?? input?.ID ?? ''),
    name: String(input?.name ?? input?.Name ?? ''),
    location: input?.location ?? input?.Location,
    address: input?.address ?? input?.Address,
    totalSpots: Number(totalSpots) || 0,
    availableSpots: computedAvailable,
    pricePerHour: pricePerHour !== undefined ? Number(pricePerHour) : undefined,
    createdAt: input?.createdAt ?? input?.CreatedAt,
    updatedAt: input?.updatedAt ?? input?.UpdatedAt,
  };
};

const normalizeSpot = (input: AnyRecord): Spot => {
  const statusRaw = String(input?.status ?? input?.Status ?? '').toLowerCase().trim();

  // Prefer IsOccupied if present (DB has it)
  const isOccupiedRaw =
    input?.IsOccupied ?? input?.isOccupied ?? input?.is_occupied ?? undefined;

  const isOccupied =
    isOccupiedRaw !== undefined ? Boolean(isOccupiedRaw) : (statusRaw === 'occupied');

  const isAvailable =
    input?.IsAvailable ??
    input?.isAvailable ??
    !isOccupied;

  return {
    id: String(input?.id ?? input?.Id ?? input?.ID ?? ''),
    ParkingId: String(input?.ParkingId ?? input?.parkingId ?? input?.parking_id ?? ''),
    SpotNumber: String(input?.spot_number ?? input?.SpotNumber ?? input?.spotNumber ?? ''),
    IsAvailable: Boolean(isAvailable),
    createdAt: input?.createdAt ?? input?.CreatedAt,
    updatedAt: input?.updatedAt ?? input?.UpdatedAt,
  };
};

const toSpotPayload = (data: Partial<Spot> & AnyRecord) => {
  // Accept many shapes from UI
  const spotNumber = data?.SpotNumber ?? data?.spotNumber ?? data?.spot_number;
  const parkingId = data?.ParkingId ?? data?.parkingId ?? data?.parking_id;

  if (spotNumber === undefined || spotNumber === null || String(spotNumber).trim() === '') {
    throw new Error('SpotNumber is required');
  }
  if (parkingId === undefined || parkingId === null || String(parkingId).trim() === '') {
    throw new Error('ParkingId is required');
  }

  const statusRaw = String(data?.status ?? data?.Status ?? '').toLowerCase().trim();
  const isAvailable =
    data?.IsAvailable ??
    data?.isAvailable ??
    (statusRaw ? statusRaw !== 'occupied' : true);

  return {
    // backend/DB expects these names
    spot_number: Number.isFinite(Number(spotNumber)) ? Number(spotNumber) : String(spotNumber),
    status: isAvailable ? 'free' : 'occupied',
    ParkingId: Number(parkingId),
    // optional but helpful if backend supports it
    IsOccupied: isAvailable ? 0 : 1,
  };
};

const normalizeReservation = (input: AnyRecord): Reservation => {
  const spotNumber = input?.spot_number ?? input?.SpotNumber ?? input?.spotNumber;
  const parkingId = input?.ParkingId ?? input?.parkingId ?? input?.parking_id;

  return {
    id: String(input?.id ?? input?.Id ?? input?.ID ?? ''),
    UserId: String(input?.user_id ?? input?.UserId ?? input?.userId ?? ''),
    ParkingId: String(parkingId ?? ''),
    SpotId: String(input?.spot_id ?? input?.SpotId ?? input?.spotId ?? ''),
    VehiclePlate: String(input?.vehicle_plate ?? input?.VehiclePlate ?? input?.vehiclePlate ?? ''),
    StartTime: String(input?.start_time ?? input?.StartTime ?? input?.startTime ?? ''),
    EndTime: String(input?.end_time ?? input?.EndTime ?? input?.endTime ?? ''),
    Status: input?.Status ?? input?.status,
    parking:
      input?.parking_name !== undefined
        ? {
            id: String(parkingId ?? ''),
            name: String(input?.parking_name ?? ''),
            totalSpots: 0,
          }
        : undefined,
    spot:
      spotNumber !== undefined || parkingId !== undefined
        ? {
            id: String(input?.spot_id ?? input?.SpotId ?? input?.spotId ?? ''),
            ParkingId: String(parkingId ?? ''),
            SpotNumber: String(spotNumber ?? ''),
            IsAvailable: true,
          }
        : undefined,
  };
};

const AUTH_BASE = import.meta.env.VITE_AUTH_URL ?? '';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    // keep the original AxiosError so you can read error.response.data.details
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${AUTH_BASE}/api/auth/register`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      token: response.data.token,
      user: normalizeUser(response.data.user as AnyRecord),
    };
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${AUTH_BASE}/api/auth/login`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      token: response.data.token,
      user: normalizeUser(response.data.user as AnyRecord),
    };
  },
};

// Parkings API
export const parkingsApi = {
  getAll: async (): Promise<Parking[]> => {
    const response = await api.get<Parking[]>('/parkings');
    return (response.data as AnyRecord[]).map(normalizeParking);
  },

  getById: async (id: string): Promise<Parking> => {
    const response = await api.get<Parking>(`/parkings/${id}`);
    return normalizeParking(response.data as AnyRecord);
  },

  create: async (data: Partial<Parking>): Promise<Parking> => {
    const response = await api.post<Parking>('/parkings', data);
    return normalizeParking(response.data as AnyRecord);
  },

  update: async (id: string, data: Partial<Parking>): Promise<Parking> => {
    const response = await api.put<Parking>(`/parkings/${id}`, data);
    return normalizeParking(response.data as AnyRecord);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/parkings/${id}`);
  },
};

// Spots API
export const spotsApi = {
  getByParkingId: async (parkingId: string): Promise<Spot[]> => {
    try {
      const response = await api.get<Spot[]>(`/parkings/${parkingId}/spots`);
      return (response.data as AnyRecord[]).map(normalizeSpot);
    } catch {
      const response = await api.get<Spot[]>('/spots');
      return (response.data as AnyRecord[])
        .map(normalizeSpot)
        .filter((spot) => spot.ParkingId === String(parkingId));
    }
  },

  getAll: async (): Promise<Spot[]> => {
    const response = await api.get<Spot[]>('/spots');
    return (response.data as AnyRecord[]).map(normalizeSpot);
  },

  create: async (data: Partial<Spot>): Promise<Spot> => {
    const response = await api.post<Spot>('/spots', toSpotPayload(data));
    return normalizeSpot(response.data as AnyRecord);
  },

  update: async (id: string, data: Partial<Spot>): Promise<Spot> => {
    const response = await api.put<Spot>(`/spots/${id}`, toSpotPayload(data));
    return normalizeSpot(response.data as AnyRecord);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/spots/${id}`);
  },
};

// Reservations API
export const reservationsApi = {
  getMyReservations: async (): Promise<Reservation[]> => {
    const response = await api.get<Reservation[]>('/reservations');
    return (response.data as AnyRecord[]).map(normalizeReservation);
  },

  getAllReservations: async (): Promise<Reservation[]> => {
    const response = await api.get<Reservation[]>('/reservations/all');
    return (response.data as AnyRecord[]).map(normalizeReservation);
  },

  create: async (data: {
    ParkingId: string;
    SpotId: string;
    VehiclePlate: string;
    StartTime: string;
    EndTime: string;
  }): Promise<Reservation> => {
    const response = await api.post<Reservation>('/reservations', data);
    return normalizeReservation(response.data as AnyRecord);
  },

  getAvailability: async (params: {
    start: string;
    end: string;
    parkingId?: string;
  }): Promise<string[]> => {
    const response = await api.get<{ reservedSpotIds: string[] }>('/reservations/availability', {
      params,
    });
    return (response.data?.reservedSpotIds || []).map(String);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/reservations/${id}`);
  },
};

// Admin API
export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const [parkings, spots, reservations] = await Promise.all([
      parkingsApi.getAll(),
      spotsApi.getAll(),
      reservationsApi.getAllReservations(),
    ]);

    const now = new Date();
    const activeReservations = reservations.filter((r) => {
      const start = new Date(r.StartTime);
      const end = new Date(r.EndTime);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= now && now <= end;
    }).length;

    return {
      totalParkings: parkings.length,
      totalSpots: spots.length,
      totalReservations: reservations.length,
      activeReservations,
    };
  },
};

// Users API (admin only)
export const usersApi = {
  list: async (q?: string): Promise<AdminUser[]> => {
    const response = await api.get<{ users: AnyRecord[] }>('/users', {
      params: q ? { q } : undefined,
    });
    return (response.data.users || []).map(normalizeAdminUser);
  },
  getById: async (id: string): Promise<AdminUser> => {
    const response = await api.get<{ user: AnyRecord }>(`/users/${id}`);
    return normalizeAdminUser(response.data.user);
  },
  create: async (data: { name: string; email: string; password: string; role: 'admin' | 'user' }) => {
    const response = await api.post<{ user: AnyRecord }>('/users', data);
    return normalizeAdminUser(response.data.user);
  },
  update: async (id: string, data: { name: string; email: string; role: 'admin' | 'user' }) => {
    const response = await api.put<{ user: AnyRecord }>(`/users/${id}`, data);
    return normalizeAdminUser(response.data.user);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
  updatePassword: async (id: string, password: string): Promise<void> => {
    await api.patch(`/users/${id}/password`, { password });
  },
};

export default api;
