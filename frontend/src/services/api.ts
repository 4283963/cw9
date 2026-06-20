import type {
  FloorPlan,
  FloorPlanRequest,
  OptimizeRequest,
  OptimizeResponse,
  ApiResponse,
} from '../types'

const API_BASE = '/api/v1'

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`)
  }
  return data as T
}

export const floorPlanService = {
  async getDefault(): Promise<ApiResponse<{ floorPlan: FloorPlan; area: number; perimeter: number }>> {
    return request(`${API_BASE}/floorplans/default`)
  },

  async getAll(): Promise<ApiResponse<FloorPlan[]>> {
    return request(`${API_BASE}/floorplans`)
  },

  async getById(id: string): Promise<ApiResponse<FloorPlan>> {
    return request(`${API_BASE}/floorplans/${id}`)
  },

  async create(req: FloorPlanRequest): Promise<ApiResponse<FloorPlan>> {
    return request(`${API_BASE}/floorplans`, {
      method: 'POST',
      body: JSON.stringify(req),
    })
  },

  async update(id: string, req: FloorPlanRequest): Promise<ApiResponse<FloorPlan>> {
    return request(`${API_BASE}/floorplans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    })
  },

  async delete(id: string): Promise<{ message: string }> {
    return request(`${API_BASE}/floorplans/${id}`, {
      method: 'DELETE',
    })
  },

  async optimize(req: OptimizeRequest): Promise<ApiResponse<OptimizeResponse>> {
    return request(`${API_BASE}/floorplans/optimize`, {
      method: 'POST',
      body: JSON.stringify(req),
    })
  },
}
