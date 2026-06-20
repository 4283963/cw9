export interface CornerPoint {
  id?: string
  floorPlanId?: string
  x: number
  y: number
  z: number
  orderIndex: number
  createdAt?: string
  updatedAt?: string
}

export interface FloorPlan {
  id: string
  name: string
  description: string
  wallHeight: number
  propertyId?: string
  corners: CornerPoint[]
  createdAt?: string
  updatedAt?: string
}

export interface FloorPlanRequest {
  name: string
  description: string
  wallHeight: number
  propertyId?: string
  corners: CornerPoint[]
}

export interface OptimizeRequest {
  corners: CornerPoint[]
  wallHeight: number
  tolerance?: number
}

export interface OptimizeResponse {
  valid: boolean
  corners: CornerPoint[]
  message?: string
  area: number
  perimeter: number
}

export type FurnitureType = 'sofa' | 'bed' | 'table' | 'chair' | 'wardrobe'

export interface Furniture {
  id: string
  type: FurnitureType
  position: { x: number; y: number; z: number }
  dimensions: { width: number; height: number; depth: number }
  rotationY: number
  color: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
