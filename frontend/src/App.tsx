import { useEffect, useRef, useState, useCallback } from 'react'
import FloorPlanViewer from './components/FloorPlanViewer'
import ControlPanel from './components/ControlPanel'
import { floorPlanService } from './services/api'
import type { FloorPlan, CornerPoint } from './types'
import { SceneManager } from './utils/SceneManager'

function App() {
  const viewerRef = useRef<SceneManager | null>(null)
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
  const [status, setStatus] = useState<string>('正在加载默认户型...')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [area, setArea] = useState(0)
  const [perimeter, setPerimeter] = useState(0)
  const [cornersVersion, setCornersVersion] = useState(0)

  const loadDefault = useCallback(async () => {
    try {
      const resp = await floorPlanService.getDefault()
      if (resp.data?.floorPlan) {
        const fp = resp.data.floorPlan
        setFloorPlan(fp)
        setArea(resp.data.area || 0)
        setPerimeter(resp.data.perimeter || 0)
        setStatus('默认户型加载完成，拖拽橙色球体开始编辑')
      }
    } catch (err: any) {
      console.error('Failed to load default:', err)
      const defaultCorners: CornerPoint[] = [
        { x: 0, y: 0, z: 0, orderIndex: 0 },
        { x: 6, y: 0, z: 0, orderIndex: 1 },
        { x: 6, y: 0, z: 4, orderIndex: 2 },
        { x: 0, y: 0, z: 4, orderIndex: 3 },
      ]
      setFloorPlan({
        id: '',
        name: '默认户型',
        description: '初始户型模板',
        wallHeight: 2.8,
        corners: defaultCorners,
      })
      setArea(24)
      setPerimeter(20)
      setStatus(`连接后端失败: ${err.message}，使用本地默认数据`)
    }
  }, [])

  useEffect(() => {
    loadDefault()
  }, [loadDefault])

  const handleCornerMoved = useCallback(() => {
    if (viewerRef.current) {
      setArea(viewerRef.current.getArea())
      setPerimeter(viewerRef.current.getPerimeter())
    }
  }, [])

  const handleOptimize = useCallback(async () => {
    if (!viewerRef.current || !floorPlan) return
    setIsOptimizing(true)
    setStatus('正在优化坐标，请稍候...')
    try {
      const currentCorners = viewerRef.current.getCorners()
      const resp = await floorPlanService.optimize({
        corners: currentCorners,
        wallHeight: floorPlan.wallHeight,
        tolerance: 0.05,
      })
      if (resp.data) {
        const { valid, corners: optCorners, message, area: optArea, perimeter: optPerimeter } = resp.data
        if (valid && optCorners) {
          for (let i = 0; i < optCorners.length && i < currentCorners.length; i++) {
            if (currentCorners[i].id) {
              optCorners[i].id = currentCorners[i].id
            }
          }
          setFloorPlan((prev) => (prev ? { ...prev, corners: optCorners } : prev))
          setArea(optArea || 0)
          setPerimeter(optPerimeter || 0)
          setCornersVersion((v) => v + 1)
          setStatus(`✅ 坐标优化成功 - ${message || '已合规化'}`)
        } else {
          setStatus(`⚠️ 坐标优化失败: ${message || '无法优化，请检查户型结构'}`)
        }
      }
    } catch (err: any) {
      setStatus(`❌ 优化请求失败: ${err.message}`)
    } finally {
      setIsOptimizing(false)
    }
  }, [floorPlan])

  const handleSave = useCallback(async () => {
    if (!viewerRef.current || !floorPlan) return
    setIsSaving(true)
    setStatus('正在保存到数据库...')
    try {
      const currentCorners = viewerRef.current.getCorners()
      const req = {
        name: floorPlan.name,
        description: floorPlan.description,
        wallHeight: floorPlan.wallHeight,
        propertyId: floorPlan.propertyId,
        corners: currentCorners,
      }
      let resp
      if (floorPlan.id) {
        resp = await floorPlanService.update(floorPlan.id, req)
      } else {
        resp = await floorPlanService.create(req)
      }
      if (resp.data) {
        const saved = resp.data
        setFloorPlan(saved)
        setCornersVersion((v) => v + 1)
        setStatus(`💾 保存成功！户型ID: ${saved.id.substring(0, 8)}...`)
      }
    } catch (err: any) {
      setStatus(`❌ 保存失败: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }, [floorPlan])

  const handleReset = useCallback(async () => {
    setStatus('正在重置户型...')
    await loadDefault()
    setCornersVersion((v) => v + 1)
  }, [loadDefault])

  const handleNameChange = useCallback((name: string) => {
    setFloorPlan((prev) => (prev ? { ...prev, name } : prev))
  }, [])

  const handleDescChange = useCallback((description: string) => {
    setFloorPlan((prev) => (prev ? { ...prev, description } : prev))
  }, [])

  const handleHeightChange = useCallback((wallHeight: number) => {
    setFloorPlan((prev) => (prev ? { ...prev, wallHeight } : prev))
    setCornersVersion((v) => v + 1)
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
        padding: '0',
        margin: 0,
      }}
    >
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff',
              fontWeight: 800,
            }}
          >
            🏠
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              CW9 房产 VR 看房系统
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              3D 户型空间重构工具 · Three.js + React + Go
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
              }}
            />
            <span style={{ color: '#374151' }}>API在线</span>
          </div>
          <div style={{ color: '#6b7280' }}>端口: 8080</div>
        </div>
      </header>

      <main
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '24px 32px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '4px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              {floorPlan?.corners && (
                <FloorPlanViewer
                  key={cornersVersion}
                  corners={floorPlan.corners}
                  wallHeight={floorPlan.wallHeight}
                  onCornerMoved={handleCornerMoved}
                  viewerRef={viewerRef}
                />
              )}
            </div>

            {floorPlan?.corners && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                    当前角点坐标 ({floorPlan.corners.length} 个)
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>实时同步3D画布</div>
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {[...floorPlan.corners]
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((c, i) => (
                      <div
                        key={c.id || i}
                        style={{
                          padding: '8px 10px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#ff6b35' }}>P{c.orderIndex}</div>
                        <div style={{ color: '#475569' }}>
                          X:{c.x.toFixed(2)} Z:{c.z.toFixed(2)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'sticky', top: '24px' }}>
            <ControlPanel
              floorPlan={floorPlan}
              area={area}
              perimeter={perimeter}
              status={status}
              isOptimizing={isOptimizing}
              isSaving={isSaving}
              onOptimize={handleOptimize}
              onSave={handleSave}
              onReset={handleReset}
              onNameChange={handleNameChange}
              onDescChange={handleDescChange}
              onHeightChange={handleHeightChange}
            />
          </div>
        </div>
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '24px',
          fontSize: '12px',
          color: '#9ca3af',
          marginTop: '32px',
        }}
      >
        © 2025 CW9 房产 · VR 看房 & 3D 户型重构平台
      </footer>
    </div>
  )
}

export default App
