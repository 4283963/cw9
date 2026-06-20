import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CornerPoint, Furniture, FurnitureType } from '../types'

const WALL_COLOR = 0xe8dcc4
const FLOOR_COLOR = 0xc9a975
const CEILING_COLOR = 0xf5efe6
const CORNER_COLOR = 0xff6b35
const GRID_COLOR = 0xdddddd
const SELECTED_COLOR = 0x00ff88
const WIRE_COLOR = 0x2563eb

const SOFA_COLOR = 0x8b5cf6
const FURNITURE_COLLISION_COLOR = 0xff0000
const FURNITURE_COLLISION_EMISSIVE = 0x660000

const WALL_THICKNESS = 0.15
const CORNER_SIZE = 0.18

interface AABB {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

type DragMode = 'none' | 'corner' | 'furniture'

const FURNITURE_PRESETS: Record<FurnitureType, { width: number; height: number; depth: number; color: number }> = {
  sofa: { width: 2.0, height: 1.2, depth: 0.9, color: SOFA_COLOR },
  bed: { width: 2.0, height: 0.8, depth: 2.1, color: 0xf59e0b },
  table: { width: 1.4, height: 0.75, depth: 0.8, color: 0xa16207 },
  chair: { width: 0.5, height: 1.0, depth: 0.5, color: 0x6366f1 },
  wardrobe: { width: 1.6, height: 2.2, depth: 0.6, color: 0x0f766e },
}

export class SceneManager {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: OrbitControls

  private container: HTMLElement
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  private floorGroup: THREE.Group
  private wallGroup: THREE.Group
  private ceilingGroup: THREE.Group
  private cornerGroup: THREE.Group
  private wireframeGroup: THREE.Group
  private furnitureGroup: THREE.Group
  private groundPlane: THREE.Mesh

  private selectedCorner: THREE.Mesh | null = null
  private isDragging: boolean = false
  private dragMode: DragMode = 'none'
  private dragPlane: THREE.Plane
  private dragOffset: THREE.Vector3

  private selectedFurniture: THREE.Group | null = null
  private selectedFurnitureId: string | null = null
  private furnitureDragOffset: THREE.Vector3 = new THREE.Vector3()
  private furnitureOriginalPos: THREE.Vector3 = new THREE.Vector3()
  private furnitureIsColliding: boolean = false
  private snapAnim: {
    mesh: THREE.Object3D
    from: THREE.Vector3
    to: THREE.Vector3
    start: number
    duration: number
  } | null = null

  private corners: CornerPoint[] = []
  private wallHeight: number = 2.8

  private cornerMeshes: Map<string, THREE.Mesh> = new Map()
  private furniture: Furniture[] = []
  private furnitureMeshes: Map<string, THREE.Group> = new Map()

  private onCornerMoved: ((index: number, x: number, z: number) => void) | null = null
  private onFurnitureChanged: (() => void) | null = null
  private animationId: number | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    this.dragOffset = new THREE.Vector3()

    const width = container.clientWidth
    const height = container.clientHeight

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    this.camera.position.set(8, 8, 10)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(width, height)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor(0xf8f5f0, 1)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.target.set(3, 0, 2)
    this.controls.minDistance = 2
    this.controls.maxDistance = 50
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05

    this.floorGroup = new THREE.Group()
    this.wallGroup = new THREE.Group()
    this.ceilingGroup = new THREE.Group()
    this.cornerGroup = new THREE.Group()
    this.wireframeGroup = new THREE.Group()
    this.furnitureGroup = new THREE.Group()

    this.scene.add(this.floorGroup)
    this.scene.add(this.wallGroup)
    this.scene.add(this.ceilingGroup)
    this.scene.add(this.cornerGroup)
    this.scene.add(this.wireframeGroup)
    this.scene.add(this.furnitureGroup)

    this.setupLights()
    this.setupGrid()
    this.setupGround()
    this.setupEvents()
    this.animate()
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(10, 15, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 50
    dirLight.shadow.camera.left = -20
    dirLight.shadow.camera.right = 20
    dirLight.shadow.camera.top = 20
    dirLight.shadow.camera.bottom = -20
    this.scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-5, 8, -5)
    this.scene.add(fillLight)
  }

  private setupGrid(): void {
    const grid = new THREE.GridHelper(30, 30, GRID_COLOR, GRID_COLOR)
    grid.position.y = -0.01
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.4
    this.scene.add(grid)
  }

  private setupGround(): void {
    const geom = new THREE.PlaneGeometry(30, 30)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf5f0e8,
      transparent: true,
      opacity: 0.8,
    })
    this.groundPlane = new THREE.Mesh(geom, mat)
    this.groundPlane.rotation.x = -Math.PI / 2
    this.groundPlane.position.y = -0.02
    this.groundPlane.receiveShadow = true
    this.scene.add(this.groundPlane)
  }

  private setupEvents(): void {
    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this))
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this))
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this))
    window.addEventListener('resize', this.onResize.bind(this))
  }

  private onResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onPointerDown(event: PointerEvent): void {
    this.updateMouse(event)
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // Furniture has drag priority so a sofa over a corner is still grabbable
    const furnIntersects = this.raycaster.intersectObjects(this.furnitureGroup.children, true)
    if (furnIntersects.length > 0) {
      let obj: THREE.Object3D | null = furnIntersects[0].object
      let group: THREE.Group | null = null
      let furnitureId: string | null = null
      while (obj) {
        if (obj.userData && obj.userData.furnitureId) {
          furnitureId = obj.userData.furnitureId as string
          group = obj as THREE.Group
          break
        }
        obj = obj.parent
      }
      if (furnitureId && group) {
        this.selectedFurniture = group
        this.selectedFurnitureId = furnitureId
        this.snapAnim = null
        const point = furnIntersects[0].point
        this.furnitureDragOffset.set(point.x - group.position.x, 0, point.z - group.position.z)
        this.furnitureOriginalPos.copy(group.position)
        this.furnitureIsColliding = false
        this.setFurnitureColor(group, false)
        this.isDragging = true
        this.dragMode = 'furniture'
        this.controls.enabled = false
        this.renderer.domElement.setPointerCapture(event.pointerId)
        return
      }
    }

    const intersects = this.raycaster.intersectObjects(this.cornerGroup.children, false)
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      this.selectedCorner = mesh
      this.highlightCorner(mesh, true)
      this.isDragging = true
      this.dragMode = 'corner'
      this.controls.enabled = false
      const point = intersects[0].point
      this.dragOffset.copy(point).sub(mesh.position)
      this.renderer.domElement.setPointerCapture(event.pointerId)
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return

    if (this.dragMode === 'corner' && this.selectedCorner) {
      this.updateMouse(event)
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersection = new THREE.Vector3()
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const newPos = intersection.sub(this.dragOffset)
        const clampedX = Math.max(-100, Math.min(100, Number.isFinite(newPos.x) ? newPos.x : 0))
        const clampedZ = Math.max(-100, Math.min(100, Number.isFinite(newPos.z) ? newPos.z : 0))
        this.selectedCorner.position.x = clampedX
        this.selectedCorner.position.z = clampedZ
        const index = this.selectedCorner.userData.orderIndex as number
        if (this.onCornerMoved && Number.isInteger(index) && index >= 0 && index < this.corners.length) {
          this.onCornerMoved(index, clampedX, clampedZ)
        }
        if (Number.isInteger(index) && index >= 0 && index < this.corners.length) {
          this.corners[index].x = clampedX
          this.corners[index].z = clampedZ
          this.updateWalls()
          this.updateWireframe()
        }
      }
      return
    }

    if (this.dragMode === 'furniture' && this.selectedFurniture && this.selectedFurnitureId) {
      this.updateMouse(event)
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersection = new THREE.Vector3()
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const rawX = intersection.x - this.furnitureDragOffset.x
        const rawZ = intersection.z - this.furnitureDragOffset.z
        const clampedX = Math.max(-100, Math.min(100, Number.isFinite(rawX) ? rawX : 0))
        const clampedZ = Math.max(-100, Math.min(100, Number.isFinite(rawZ) ? rawZ : 0))

        const colliding = this.checkFurnitureCollision(this.selectedFurnitureId, clampedX, clampedZ)
        if (colliding) {
          // Block: keep at last valid position, turn red to signal rejection
          this.setFurnitureColor(this.selectedFurniture, true)
          this.furnitureIsColliding = true
        } else {
          this.setFurnitureColor(this.selectedFurniture, false)
          this.furnitureIsColliding = false
          this.selectedFurniture.position.x = clampedX
          this.selectedFurniture.position.z = clampedZ
          const f = this.furniture.find((ff) => ff.id === this.selectedFurnitureId)
          if (f) {
            f.position.x = clampedX
            f.position.z = clampedZ
          }
        }
      }
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.dragMode === 'corner' && this.selectedCorner) {
      this.highlightCorner(this.selectedCorner, false)
    }

    if (this.dragMode === 'furniture' && this.selectedFurniture) {
      if (this.furnitureIsColliding) {
        // Release while blocked: spring back to the original position
        this.startSnapBack(this.selectedFurniture, this.furnitureOriginalPos)
        const f = this.furniture.find((ff) => ff.id === this.selectedFurnitureId)
        if (f) {
          f.position.x = this.furnitureOriginalPos.x
          f.position.z = this.furnitureOriginalPos.z
        }
      }
      this.setFurnitureColor(this.selectedFurniture, false)
    }

    this.selectedCorner = null
    this.selectedFurniture = null
    this.selectedFurnitureId = null
    this.furnitureIsColliding = false
    this.isDragging = false
    this.dragMode = 'none'
    this.controls.enabled = true
    try {
      this.renderer.domElement.releasePointerCapture(event.pointerId)
    } catch {}
  }

  private highlightCorner(mesh: THREE.Mesh, selected: boolean): void {
    const mat = mesh.material as THREE.MeshStandardMaterial
    mat.color.setHex(selected ? SELECTED_COLOR : CORNER_COLOR)
    mat.emissive.setHex(selected ? 0x00aa44 : 0x220000)
    mesh.scale.setScalar(selected ? 1.3 : 1)
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose()
      }
      if ((child as THREE.Mesh).material) {
        const mats = (child as THREE.Mesh).material as THREE.Material | THREE.Material[]
        if (Array.isArray(mats)) {
          mats.forEach(m => m.dispose())
        } else {
          mats.dispose()
        }
      }
    }
  }

  public setCorners(corners: CornerPoint[], wallHeight: number = 2.8): void {
    const validCorners = corners
      .filter((c) => c != null)
      .map((c, idx) => ({
        id: c.id,
        floorPlanId: c.floorPlanId,
        x: Number.isFinite(c.x) ? c.x : idx * 1.5,
        y: Number.isFinite(c.y) ? c.y : 0,
        z: Number.isFinite(c.z) ? c.z : idx * 1.0,
        orderIndex: Number.isInteger(c.orderIndex) ? c.orderIndex : idx,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex)

    this.corners = validCorners
    this.wallHeight = Number.isFinite(wallHeight) && wallHeight > 0.1 ? wallHeight : 2.8
    this.cornerMeshes.clear()
    this.clearGroup(this.cornerGroup)
    this.clearGroup(this.floorGroup)
    this.clearGroup(this.wallGroup)
    this.clearGroup(this.ceilingGroup)
    this.clearGroup(this.wireframeGroup)
    this.clearGroup(this.furnitureGroup)
    this.furnitureMeshes.clear()
    this.furniture = []

    this.buildCorners()
    this.buildFloor()
    this.buildWalls()
    this.buildCeiling()
    this.buildWireframe()
  }

  public getCorners(): CornerPoint[] {
    return this.corners.map((c, idx) => ({
      id: c.id,
      floorPlanId: c.floorPlanId,
      x: Number.isFinite(c.x) ? c.x : idx * 1.5,
      y: Number.isFinite(c.y) ? c.y : 0,
      z: Number.isFinite(c.z) ? c.z : idx * 1.0,
      orderIndex: Number.isInteger(c.orderIndex) ? c.orderIndex : idx,
    }))
  }

  private buildCorners(): void {
    const sortedCorners = [...this.corners].sort((a, b) => a.orderIndex - b.orderIndex)
    this.corners = sortedCorners

    for (const corner of this.corners) {
      const geom = new THREE.SphereGeometry(CORNER_SIZE, 24, 24)
      const mat = new THREE.MeshStandardMaterial({
        color: CORNER_COLOR,
        emissive: 0x220000,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.2,
      })
      const sphere = new THREE.Mesh(geom, mat)
      sphere.position.set(corner.x, CORNER_SIZE, corner.z)
      sphere.castShadow = true
      sphere.userData = { orderIndex: corner.orderIndex, cornerId: corner.id }
      this.cornerGroup.add(sphere)
      this.cornerMeshes.set(corner.id || String(corner.orderIndex), sphere)
    }
  }

  private buildFloor(): void {
    if (this.corners.length < 3) return
    const shape = new THREE.Shape()
    shape.moveTo(this.corners[0].x, this.corners[0].z)
    for (let i = 1; i < this.corners.length; i++) {
      shape.lineTo(this.corners[i].x, this.corners[i].z)
    }
    shape.closePath()

    const geom = new THREE.ShapeGeometry(shape)
    geom.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      side: THREE.DoubleSide,
      roughness: 0.7,
    })
    const floor = new THREE.Mesh(geom, mat)
    floor.receiveShadow = true
    floor.position.y = 0
    this.floorGroup.add(floor)
  }

  private buildWalls(): void {
    if (this.corners.length < 2) return
    for (let i = 0; i < this.corners.length; i++) {
      const start = this.corners[i]
      const end = this.corners[(i + 1) % this.corners.length]
      const wallMesh = this.createWall(start.x, start.z, end.x, end.z)
      this.wallGroup.add(wallMesh)
    }
  }

  private createWall(x1: number, z1: number, x2: number, z2: number): THREE.Mesh {
    const length = Math.hypot(x2 - x1, z2 - z1)
    const angle = Math.atan2(x2 - x1, z2 - z1)

    const geom = new THREE.BoxGeometry(WALL_THICKNESS, this.wallHeight, length)
    const mat = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: 0.85,
    })
    const wall = new THREE.Mesh(geom, mat)

    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    wall.position.set(midX, this.wallHeight / 2, midZ)
    wall.rotation.y = -angle
    wall.castShadow = true
    wall.receiveShadow = true
    return wall
  }

  private updateWalls(): void {
    this.clearGroup(this.wallGroup)
    this.buildWalls()
  }

  private buildCeiling(): void {
    if (this.corners.length < 3) return
    const shape = new THREE.Shape()
    shape.moveTo(this.corners[0].x, this.corners[0].z)
    for (let i = 1; i < this.corners.length; i++) {
      shape.lineTo(this.corners[i].x, this.corners[i].z)
    }
    shape.closePath()

    const geom = new THREE.ShapeGeometry(shape)
    geom.rotateX(Math.PI / 2)
    const mat = new THREE.MeshStandardMaterial({
      color: CEILING_COLOR,
      side: THREE.DoubleSide,
      roughness: 0.9,
      transparent: true,
      opacity: 0.7,
    })
    const ceiling = new THREE.Mesh(geom, mat)
    ceiling.position.y = this.wallHeight
    ceiling.receiveShadow = true
    this.ceilingGroup.add(ceiling)
  }

  private buildWireframe(): void {
    if (this.corners.length < 2) return
    const points: THREE.Vector3[] = []
    for (const c of this.corners) {
      points.push(new THREE.Vector3(c.x, 0, c.z))
    }
    points.push(new THREE.Vector3(this.corners[0].x, 0, this.corners[0].z))
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineDashedMaterial({
      color: WIRE_COLOR,
      dashSize: 0.3,
      gapSize: 0.15,
      linewidth: 2,
    })
    const wire = new THREE.Line(geom, mat)
    wire.computeLineDistances()
    this.wireframeGroup.add(wire)

    const points2: THREE.Vector3[] = []
    for (const c of this.corners) {
      points2.push(new THREE.Vector3(c.x, this.wallHeight, c.z))
    }
    points2.push(new THREE.Vector3(this.corners[0].x, this.wallHeight, this.corners[0].z))
    const geom2 = new THREE.BufferGeometry().setFromPoints(points2)
    const wire2 = new THREE.Line(geom2, mat.clone())
    wire2.computeLineDistances()
    this.wireframeGroup.add(wire2)
  }

  private updateWireframe(): void {
    this.clearGroup(this.wireframeGroup)
    this.buildWireframe()
  }

  public setCornerMovedCallback(callback: (index: number, x: number, z: number) => void): void {
    this.onCornerMoved = callback
  }

  public setFurnitureChangedCallback(callback: () => void): void {
    this.onFurnitureChanged = callback
  }

  // ===== Furniture: creation =====

  private createSofaMesh(furnitureId: string, color: number): THREE.Group {
    const group = new THREE.Group()
    const makeMat = () =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.9), makeMat())
    base.position.set(0, 0.2, 0)
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.2), makeMat())
    back.position.set(0, 0.8, -0.35)
    back.castShadow = true
    group.add(back)

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.9), makeMat())
    leftArm.position.set(-0.9, 0.5, 0)
    leftArm.castShadow = true
    group.add(leftArm)

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.9), makeMat())
    rightArm.position.set(0.9, 0.5, 0)
    rightArm.castShadow = true
    group.add(rightArm)

    group.userData.furnitureId = furnitureId
    group.userData.baseColor = color
    group.userData.isFurniture = true
    group.traverse((c) => {
      c.userData.furnitureId = furnitureId
    })
    return group
  }

  private createFurnitureMesh(type: FurnitureType, furnitureId: string, color: number): THREE.Group {
    if (type === 'sofa') {
      return this.createSofaMesh(furnitureId, color)
    }
    // Generic fallback: a single labeled box
    const preset = FURNITURE_PRESETS[type]
    const group = new THREE.Group()
    const geom = new THREE.BoxGeometry(preset.width, preset.height, preset.depth)
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.position.set(0, preset.height / 2, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    group.userData.furnitureId = furnitureId
    group.userData.baseColor = color
    group.userData.isFurniture = true
    group.traverse((c) => {
      c.userData.furnitureId = furnitureId
    })
    return group
  }

  // ===== Furniture: AABB & collision =====

  private getFurnitureAABB(f: Furniture): AABB {
    const hw = f.dimensions.width / 2
    const hd = f.dimensions.depth / 2
    const cos = Math.abs(Math.cos(f.rotationY))
    const sin = Math.abs(Math.sin(f.rotationY))
    const halfX = hw * cos + hd * sin
    const halfZ = hw * sin + hd * cos
    return {
      minX: f.position.x - halfX,
      maxX: f.position.x + halfX,
      minY: f.position.y,
      maxY: f.position.y + f.dimensions.height,
      minZ: f.position.z - halfZ,
      maxZ: f.position.z + halfZ,
    }
  }

  private getWallAABBs(): AABB[] {
    const boxes: AABB[] = []
    if (this.corners.length < 2) return boxes
    const t = WALL_THICKNESS
    for (let i = 0; i < this.corners.length; i++) {
      const a = this.corners[i]
      const b = this.corners[(i + 1) % this.corners.length]
      const dx = b.x - a.x
      const dz = b.z - a.z
      const len = Math.hypot(dx, dz)
      if (len < 1e-6) continue
      const nx = -dz / len
      const nz = dx / len
      const ox = nx * (t / 2)
      const oz = nz * (t / 2)
      const corners = [
        a.x + ox, a.z + oz,
        a.x - ox, a.z - oz,
        b.x + ox, b.z + oz,
        b.x - ox, b.z - oz,
      ]
      const xs = [corners[0], corners[2], corners[4], corners[6]]
      const zs = [corners[1], corners[3], corners[5], corners[7]]
      boxes.push({
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: 0,
        maxY: this.wallHeight,
        minZ: Math.min(...zs),
        maxZ: Math.max(...zs),
      })
    }
    return boxes
  }

  private aabbOverlap(a: AABB, b: AABB): boolean {
    return (
      a.minX < b.maxX && a.maxX > b.minX &&
      a.minY < b.maxY && a.maxY > b.minY &&
      a.minZ < b.maxZ && a.maxZ > b.minZ
    )
  }

  private checkCollisionAt(
    dims: { width: number; height: number; depth: number },
    x: number,
    z: number,
    ignoreId?: string
  ): boolean {
    const testFurniture: Furniture = {
      id: '__test__',
      type: 'sofa',
      position: { x, y: 0, z },
      dimensions: dims,
      rotationY: 0,
      color: 0,
    }
    const testAABB = this.getFurnitureAABB(testFurniture)
    for (const wb of this.getWallAABBs()) {
      if (this.aabbOverlap(testAABB, wb)) return true
    }
    for (const other of this.furniture) {
      if (other.id === ignoreId) continue
      if (this.aabbOverlap(testAABB, this.getFurnitureAABB(other))) return true
    }
    return false
  }

  private checkFurnitureCollision(furnitureId: string, x: number, z: number): boolean {
    const f = this.furniture.find((ff) => ff.id === furnitureId)
    if (!f) return false
    return this.checkCollisionAt(f.dimensions, x, z, furnitureId)
  }

  private findFreeSpot(dims: { width: number; height: number; depth: number }): { x: number; z: number } {
    if (this.corners.length >= 3) {
      let cx = 0
      let cz = 0
      for (const c of this.corners) {
        cx += c.x
        cz += c.z
      }
      cx /= this.corners.length
      cz /= this.corners.length
      const candidates = [
        { x: cx, z: cz },
        { x: cx + 1.5, z: cz },
        { x: cx - 1.5, z: cz },
        { x: cx, z: cz + 1.5 },
        { x: cx, z: cz - 1.5 },
        { x: cx + 1.5, z: cz + 1.5 },
        { x: cx - 1.5, z: cz - 1.5 },
      ]
      for (const cand of candidates) {
        if (!this.checkCollisionAt(dims, cand.x, cand.z)) {
          return cand
        }
      }
    }
    return { x: 2, z: 2 }
  }

  // ===== Furniture: color & snap-back =====

  private setFurnitureColor(group: THREE.Object3D, red: boolean): void {
    const baseColor = (group.userData.baseColor as number) ?? SOFA_COLOR
    const targetColor = red ? FURNITURE_COLLISION_COLOR : baseColor
    const targetEmissive = red ? FURNITURE_COLLISION_EMISSIVE : 0x000000
    group.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
      if (Array.isArray(mat)) {
        mat.forEach((m) => {
          m.color.setHex(targetColor)
          m.emissive.setHex(targetEmissive)
        })
      } else if (mat) {
        mat.color.setHex(targetColor)
        mat.emissive.setHex(targetEmissive)
      }
    })
  }

  private startSnapBack(mesh: THREE.Object3D, to: THREE.Vector3): void {
    this.snapAnim = {
      mesh,
      from: mesh.position.clone(),
      to: to.clone(),
      start: performance.now(),
      duration: 280,
    }
  }

  // ===== Furniture: public API =====

  public addFurniture(type: FurnitureType = 'sofa', position?: { x: number; z: number }): string {
    const preset = FURNITURE_PRESETS[type]
    const dims = { width: preset.width, height: preset.height, depth: preset.depth }
    const spot = position
      ? { x: position.x, z: position.z }
      : this.findFreeSpot(dims)
    const id = `furn-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    const mesh = this.createFurnitureMesh(type, id, preset.color)
    mesh.position.set(spot.x, 0, spot.z)
    this.furnitureGroup.add(mesh)
    this.furnitureMeshes.set(id, mesh)
    const furniture: Furniture = {
      id,
      type,
      position: { x: spot.x, y: 0, z: spot.z },
      dimensions: dims,
      rotationY: 0,
      color: preset.color,
    }
    this.furniture.push(furniture)
    if (this.onFurnitureChanged) this.onFurnitureChanged()
    return id
  }

  public removeLastFurniture(): void {
    if (this.furniture.length === 0) return
    const last = this.furniture[this.furniture.length - 1]
    this.removeFurniture(last.id)
  }

  public removeFurniture(id: string): void {
    const mesh = this.furnitureMeshes.get(id)
    if (mesh) {
      this.furnitureGroup.remove(mesh)
      mesh.traverse((c) => {
        const m = c as THREE.Mesh
        if (m.isMesh) {
          m.geometry?.dispose()
          const mat = m.material as THREE.Material | THREE.Material[]
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose())
          else mat?.dispose()
        }
      })
      this.furnitureMeshes.delete(id)
    }
    this.furniture = this.furniture.filter((f) => f.id !== id)
    if (this.onFurnitureChanged) this.onFurnitureChanged()
  }

  public clearFurniture(): void {
    this.clearGroup(this.furnitureGroup)
    this.furnitureMeshes.clear()
    this.furniture = []
    if (this.onFurnitureChanged) this.onFurnitureChanged()
  }

  public getFurniture(): Furniture[] {
    return this.furniture.map((f) => ({
      id: f.id,
      type: f.type,
      position: { ...f.position },
      dimensions: { ...f.dimensions },
      rotationY: f.rotationY,
      color: f.color,
    }))
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))
    this.controls.update()
    if (this.snapAnim) {
      const elapsed = performance.now() - this.snapAnim.start
      const t = Math.min(1, elapsed / this.snapAnim.duration)
      const eased = 1 - Math.pow(1 - t, 3)
      this.snapAnim.mesh.position.lerpVectors(this.snapAnim.from, this.snapAnim.to, eased)
      if (t >= 1) {
        this.snapAnim.mesh.position.copy(this.snapAnim.to)
        this.snapAnim = null
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
    }
    window.removeEventListener('resize', this.onResize.bind(this))
    this.controls.dispose()
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }

  public getArea(): number {
    if (this.corners.length < 3) return 0
    let area = 0
    const n = this.corners.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += this.corners[i].x * this.corners[j].z
      area -= this.corners[j].x * this.corners[i].z
    }
    return Math.abs(area) / 2
  }

  public getPerimeter(): number {
    let perimeter = 0
    const n = this.corners.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      perimeter += Math.hypot(
        this.corners[j].x - this.corners[i].x,
        this.corners[j].z - this.corners[i].z
      )
    }
    return perimeter
  }
}
