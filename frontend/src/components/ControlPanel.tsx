import type { FloorPlan, FurnitureType } from '../types'

interface ControlPanelProps {
  floorPlan: FloorPlan | null
  area: number
  perimeter: number
  status: string
  isOptimizing: boolean
  isSaving: boolean
  furnitureCount: number
  onOptimize: () => void
  onSave: () => void
  onReset: () => void
  onNameChange: (name: string) => void
  onDescChange: (desc: string) => void
  onHeightChange: (h: number) => void
  onAddFurniture: (type: FurnitureType) => void
  onRemoveLastFurniture: () => void
  onClearFurniture: () => void
}

export default function ControlPanel({
  floorPlan,
  area,
  perimeter,
  status,
  isOptimizing,
  isSaving,
  furnitureCount,
  onOptimize,
  onSave,
  onReset,
  onNameChange,
  onDescChange,
  onHeightChange,
  onAddFurniture,
  onRemoveLastFurniture,
  onClearFurniture,
}: ControlPanelProps) {
  return (
    <div
      style={{
        padding: '24px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937', fontWeight: 700 }}>
          户型编辑面板
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
          拖拽橙色球体调整户型，点击优化按钮合规化
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            户型名称
          </label>
          <input
            type="text"
            value={floorPlan?.name || ''}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="请输入户型名称"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            户型描述
          </label>
          <textarea
            value={floorPlan?.description || ''}
            onChange={(e) => onDescChange(e.target.value)}
            placeholder="请输入户型描述"
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'none',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px',
            }}
          >
            墙高: {floorPlan?.wallHeight?.toFixed(2) || '2.80'} m
          </label>
          <input
            type="range"
            min="2"
            max="5"
            step="0.1"
            value={floorPlan?.wallHeight || 2.8}
            onChange={(e) => onHeightChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>户型面积</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', marginTop: '2px' }}>
            {area.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}> m²</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>户型周长</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', marginTop: '2px' }}>
            {perimeter.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}> m</span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          background: '#f5f3ff',
          borderRadius: '10px',
          border: '1px solid #ddd6fe',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#5b21b6' }}>
            🛋️ 家具布置 (AABB 碰撞)
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#7c3aed',
              background: '#ede9fe',
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            {furnitureCount} 件
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          {(
            [
              { type: 'sofa' as FurnitureType, label: '🛋️ 沙发', bg: '#8b5cf6' },
              { type: 'bed' as FurnitureType, label: '🛏️ 床', bg: '#f59e0b' },
              { type: 'table' as FurnitureType, label: '🪑 桌子', bg: '#a16207' },
              { type: 'chair' as FurnitureType, label: '💺 椅子', bg: '#6366f1' },
              { type: 'wardrobe' as FurnitureType, label: '🗄️ 衣柜', bg: '#0f766e' },
            ]
          ).map((item) => (
            <button
              key={item.type}
              onClick={() => onAddFurniture(item.type)}
              style={{
                padding: '10px 6px',
                background: item.bg,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.1s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={onRemoveLastFurniture}
            disabled={furnitureCount === 0}
            style={{
              padding: '10px 6px',
              background: furnitureCount === 0 ? '#e5e7eb' : '#f3f4f6',
              color: furnitureCount === 0 ? '#9ca3af' : '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: furnitureCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ↩ 撤销
          </button>
        </div>

        <button
          onClick={onClearFurniture}
          disabled={furnitureCount === 0}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: furnitureCount === 0 ? '#fee2e2' : '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: furnitureCount === 0 ? 'not-allowed' : 'pointer',
            opacity: furnitureCount === 0 ? 0.6 : 1,
          }}
        >
          🗑️ 清空所有家具
        </button>

        <div
          style={{
            marginTop: '10px',
            fontSize: '11px',
            color: '#6d28d9',
            lineHeight: 1.5,
          }}
        >
          拖动家具时若 AABB 与墙/其他家具重叠会变红并被阻止，松开后自动弹回原位。
        </div>
      </div>

      {status && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            lineHeight: 1.5,
            background: status.includes('成功') || status.includes('完成') || status.includes('合规')
              ? '#ecfdf5'
              : status.includes('失败') || status.includes('错误')
              ? '#fef2f2'
              : '#eff6ff',
            color:
              status.includes('成功') || status.includes('完成') || status.includes('合规')
                ? '#065f46'
                : status.includes('失败') || status.includes('错误')
                ? '#991b1b'
                : '#1e40af',
            border: `1px solid ${
              status.includes('成功') || status.includes('完成') || status.includes('合规')
                ? '#a7f3d0'
                : status.includes('失败') || status.includes('错误')
                ? '#fecaca'
                : '#bfdbfe'
            }`,
          }}
        >
          {status}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          style={{
            padding: '12px 16px',
            background: isOptimizing ? '#93c5fd' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isOptimizing ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {isOptimizing ? '优化中...' : '✓ 优化并合规化坐标'}
        </button>

        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            padding: '12px 16px',
            background: isSaving ? '#6ee7b7' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {isSaving ? '保存中...' : '💾 保存到数据库'}
        </button>

        <button
          onClick={onReset}
          style={{
            padding: '12px 16px',
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          ↺ 重置为默认户型
        </button>
      </div>

      <div
        style={{
          padding: '14px',
          background: '#fffbeb',
          borderRadius: '8px',
          border: '1px solid #fde68a',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
          💡 操作提示
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#78350f', lineHeight: 1.7 }}>
          <li>拖拽橙色球可拉伸户型角点</li>
          <li>点击家具按钮放置，再拖动家具调整位置</li>
          <li>家具碰墙/其他家具(AABB重叠)会变红并被阻止</li>
          <li>松开手时若处于碰撞状态会自动弹回原位</li>
          <li>鼠标左键旋转，右键平移，滚轮缩放</li>
          <li>优化后坐标将自动吸附网格和直角</li>
          <li>保存后数据持久化到SQLite数据库</li>
        </ul>
      </div>
    </div>
  )
}
