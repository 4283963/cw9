import { useEffect, useRef } from 'react'
import { SceneManager } from '../utils/SceneManager'
import type { CornerPoint } from '../types'

interface FloorPlanViewerProps {
  corners: CornerPoint[]
  wallHeight?: number
  onCornerMoved?: (index: number, x: number, z: number) => void
  viewerRef?: React.MutableRefObject<SceneManager | null>
}

export default function FloorPlanViewer({
  corners,
  wallHeight = 2.8,
  onCornerMoved,
  viewerRef,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const internalRef = useRef<SceneManager | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const sceneManager = new SceneManager(containerRef.current)
    internalRef.current = sceneManager
    if (viewerRef) {
      viewerRef.current = sceneManager
    }
    if (corners && corners.length > 0) {
      sceneManager.setCorners(corners, wallHeight)
    }
    if (onCornerMoved) {
      sceneManager.setCornerMovedCallback(onCornerMoved)
    }
    return () => {
      sceneManager.dispose()
      internalRef.current = null
      if (viewerRef) {
        viewerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (internalRef.current && corners && corners.length > 0) {
      internalRef.current.setCorners(corners, wallHeight)
    }
  }, [corners, wallHeight])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
    />
  )
}
