import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CornerPoint } from '../types'

const WALL_COLOR = 0xe8dcc4
const FLOOR_COLOR = 0xc9a975
const CEILING_COLOR = 0xf5efe6
const CORNER_COLOR = 0xff6b35
const GRID_COLOR = 0xdddddd
const SELECTED_COLOR = 0x00ff88
const WIRE_COLOR = 0x2563eb

const WALL_THICKNESS = 0.15
const CORNER_SIZE = 0.18

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
  private groundPlane: THREE.Mesh

  private selectedCorner: THREE.Mesh | null = null
  private isDragging: boolean = false
  private dragPlane: THREE.Plane
  private dragOffset: THREE.Vector3

  private corners: CornerPoint[] = []
  private wallHeight: number = 2.8

  private cornerMeshes: Map<string, THREE.Mesh> = new Map()

  private onCornerMoved: ((index: number, x: number, z: number) => void) | null = null
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

    this.scene.add(this.floorGroup)
    this.scene.add(this.wallGroup)
    this.scene.add(this.ceilingGroup)
    this.scene.add(this.cornerGroup)
    this.scene.add(this.wireframeGroup)

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
    const intersects = this.raycaster.intersectObjects(this.cornerGroup.children, false)
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      this.selectedCorner = mesh
      this.highlightCorner(mesh, true)
      this.isDragging = true
      this.controls.enabled = false
      const point = intersects[0].point
      this.dragOffset.copy(point).sub(mesh.position)
      this.renderer.domElement.setPointerCapture(event.pointerId)
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDragging || !this.selectedCorner) return
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
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.selectedCorner) {
      this.highlightCorner(this.selectedCorner, false)
    }
    this.selectedCorner = null
    this.isDragging = false
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

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))
    this.controls.update()
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
