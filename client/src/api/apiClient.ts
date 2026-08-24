import {
  IEvent,
  IAttendee,
  IAuditLog,
  IEventAnalytics,
  IPostEventSummary,
  CheckInResponse,
  SyncCheckInRequest,
  SyncCheckInResponse,
  RegistrationResponse,
  IOrganizer,
} from '../../../shared/types.js';

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('gatekeeper_device_id');
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem('gatekeeper_device_id', deviceId);
  }
  return deviceId;
};

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = typeof window !== 'undefined' ? localStorage.getItem('gatekeeper_token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Return blob if requested (for CSV downloads)
    if (options.headers && (options.headers as Record<string, string>)['Accept'] === 'text/csv') {
      return (await response.blob()) as unknown as T;
    }

    return response.json();
  }

  // --- Auth Endpoints ---
  public async registerOrganizer(data: { name: string; email: string; password: string }): Promise<{ token: string; organizer: IOrganizer }> {
    const res = await this.request<{ token: string; organizer: IOrganizer }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      localStorage.setItem('gatekeeper_token', res.token);
    }
    return res;
  }

  public async loginOrganizer(data: { email: string; password: string }): Promise<{ token: string; organizer: IOrganizer }> {
    const res = await this.request<{ token: string; organizer: IOrganizer }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      localStorage.setItem('gatekeeper_token', res.token);
    }
    return res;
  }

  public async logoutOrganizer(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('gatekeeper_token');
    }
  }

  public async getMe(): Promise<{ organizer: IOrganizer }> {
    return this.request<{ organizer: IOrganizer }>('/api/auth/me');
  }

  // --- Event Endpoints ---
  public async getEvents(): Promise<{ events: IEvent[] }> {
    return this.request<{ events: IEvent[] }>('/api/events');
  }

  public async getEvent(id: string): Promise<{ event: IEvent }> {
    return this.request<{ event: IEvent }>(`/api/events/${id}`);
  }

  public async createEvent(data: {
    name: string;
    description?: string;
    date: string;
    startTime: string;
    venue: string;
    capacity: number;
    prefix?: string;
  }): Promise<{ event: IEvent }> {
    return this.request<{ event: IEvent }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateEvent(id: string, data: Partial<IEvent>): Promise<{ event: IEvent }> {
    return this.request<{ event: IEvent }>(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public async publishEvent(id: string): Promise<{ success: boolean; event: IEvent }> {
    return this.request<{ success: boolean; event: IEvent }>(`/api/events/${id}/publish`, {
      method: 'POST',
    });
  }

  public async startEvent(id: string): Promise<{ success: boolean; event: IEvent }> {
    return this.request<{ success: boolean; event: IEvent }>(`/api/events/${id}/start`, {
      method: 'POST',
    });
  }

  public async endEvent(id: string): Promise<{ success: boolean; event: IEvent }> {
    return this.request<{ success: boolean; event: IEvent }>(`/api/events/${id}/end`, {
      method: 'POST',
    });
  }

  public async getEventAnalytics(id: string): Promise<{ analytics: IEventAnalytics }> {
    return this.request<{ analytics: IEventAnalytics }>(`/api/events/${id}/analytics`);
  }

  public async getPostEventSummary(id: string): Promise<{ summary: IPostEventSummary }> {
    return this.request<{ summary: IPostEventSummary }>(`/api/events/${id}/summary`);
  }

  public async getAuditLogs(
    id: string,
    params?: { page?: number; limit?: number; action?: string }
  ): Promise<{ logs: IAuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.action) query.append('action', params.action);
    return this.request(`/api/events/${id}/audit-log?${query.toString()}`);
  }

  // --- Attendee Endpoints ---
  public async getPublicEvent(id: string): Promise<{
    event: {
      id: string;
      name: string;
      description: string;
      date: string;
      startTime: string;
      venue: string;
      capacity: number;
      status: string;
      prefix: string;
      registeredCount: number;
      isSoldOut: boolean;
    };
  }> {
    return this.request(`/api/events/public/${id}`);
  }

  public async registerAttendee(data: {
    eventId: string;
    name: string;
    email: string;
    ticketType?: string;
  }): Promise<RegistrationResponse> {
    return this.request<RegistrationResponse>('/api/attendees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async listAttendees(
    eventId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      filter?: string;
      ticketType?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    attendees: IAttendee[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams({ eventId });
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.filter) query.append('filter', params.filter);
    if (params?.ticketType) query.append('ticketType', params.ticketType);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

    return this.request(`/api/attendees?${query.toString()}`);
  }

  public async checkInByCode(
    eventId: string,
    code: string,
    source: 'camera' | 'manual' = 'camera'
  ): Promise<CheckInResponse> {
    return this.request<CheckInResponse>('/api/attendees/checkin-code', {
      method: 'POST',
      body: JSON.stringify({
        eventId,
        code,
        deviceId: getDeviceId(),
        source,
      }),
    });
  }

  public async checkInById(attendeeId: string): Promise<CheckInResponse> {
    return this.request<CheckInResponse>(`/api/attendees/${attendeeId}/checkin`, {
      method: 'PATCH',
    });
  }

  public async undoCheckIn(attendeeId: string, reason?: string): Promise<{ success: boolean; message: string; attendee: IAttendee }> {
    return this.request(`/api/attendees/${attendeeId}/undo-checkin`, {
      method: 'PATCH',
      body: JSON.stringify({ reason: reason || 'Accidental scan undo' }),
    });
  }

  public async resendTicket(attendeeId: string): Promise<{ success: boolean; message: string; previewUrl?: string }> {
    return this.request(`/api/attendees/${attendeeId}/resend-ticket`, {
      method: 'POST',
    });
  }

  // --- Offline Sync Endpoint ---
  public async syncOfflineScans(payload: SyncCheckInRequest): Promise<SyncCheckInResponse> {
    return this.request<SyncCheckInResponse>('/api/checkins/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
