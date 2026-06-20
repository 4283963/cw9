import type { FloorPlan } from '../types'

interface ControlPanelProps {
  floorPlan: FloorPlan | null
  area: number
  perimeter: number
  status: string
  isOptimizing: boolean
  isSaving: boolean
  onOptimize: () => void
  onSave: () => void
  onReset: () => void
  onNameChange: (name: string) => void
  onDescChange: (desc: string) => void
  onHeightChange: (h: number) => void
}

export default function ControlPanel({
  floorPlan,
  area,
  perimeter,
  status,
  isOptimizing,
  isSaving,
  onOptimize,
  onSave,
  onReset,
  onNameChange,
  onDescChange,
  onHeightChange,
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
          <li>鼠标左键旋转，右键平移，滚轮缩放</li>
          <li>优化后坐标将自动吸附网格和直角</li>
          <li>保存后数据持久化到SQLite数据库</li>
        </ul>
      </div>
    </div>
  )
}
