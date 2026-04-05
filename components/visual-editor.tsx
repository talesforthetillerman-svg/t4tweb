"use client"
/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/refs, react-hooks/immutability, react-hooks/exhaustive-deps */

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

// ==================== TYPES ====================

interface EditableElement {
  id: string
  type: string
  label: string
  value?: string
  element: HTMLElement
}

interface ElementRect {
  x: number
  y: number
  width: number
  height: number
}

interface TransformOffset {
  x: number
  y: number
}

interface DragState {
  isDragging: boolean
  startMouseX: number
  startMouseY: number
  startOffsetX: number
  startOffsetY: number
}

interface ResizeState {
  isResizing: boolean
  handle: string | null
  startMouseX: number
  startMouseY: number
  startWidth: number
  startHeight: number
  startOffsetX: number
  startOffsetY: number
  aspectRatio: number
}

interface SnapGuide {
  type: 'vertical' | 'horizontal'
  position: number
  start: number
  end: number
}

interface VisualEditorContextType {
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  selectedElement: EditableElement | null
  setSelectedElement: (element: EditableElement | null) => void
  openPanel: boolean
  setOpenPanel: (open: boolean) => void
  snapEnabled: boolean
  setSnapEnabled: (value: boolean) => void
}

// ==================== CONSTANTS ====================

const HANDLE_SIZE = 10
const SNAP_THRESHOLD = 8
const MIN_SIZE = 40

const CORNER_HANDLES = [
  { handle: 'nw', cursor: 'nwse-resize' },
  { handle: 'ne', cursor: 'nesw-resize' },
  { handle: 'se', cursor: 'nwse-resize' },
  { handle: 'sw', cursor: 'nesw-resize' },
]

// ==================== CONTEXT ====================

const VisualEditorContext = createContext<VisualEditorContextType>({
  isEditing: false,
  setIsEditing: () => {},
  selectedElement: null,
  setSelectedElement: () => {},
  openPanel: false,
  setOpenPanel: () => {},
  snapEnabled: true,
  setSnapEnabled: () => {},
})

export function useVisualEditor() {
  return useContext(VisualEditorContext)
}

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedElement, setSelectedElement] = useState<EditableElement | null>(null)
  const [openPanel, setOpenPanel] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('editMode') === 'true' || window.location.pathname === '/editor') {
      setIsEditing(true)
    }
  }, [])

  return (
    <VisualEditorContext.Provider
      value={{ isEditing, setIsEditing, selectedElement, setSelectedElement, openPanel, setOpenPanel, snapEnabled, setSnapEnabled }}
    >
      {children}
    </VisualEditorContext.Provider>
  )
}

// ==================== ELEMENT SELECTION OVERLAY ====================

function ElementSelectionOverlay({
  element,
}: {
  element: HTMLElement
}) {
  const { snapEnabled } = useVisualEditor()
  
  // Store the ORIGINAL rect when element was selected (before any transforms)
  const originalRectRef = useRef<ElementRect>({ x: 0, y: 0, width: 0, height: 0 })
  
  // Track current transform offset separately
  const [offset, setOffset] = useState<TransformOffset>({ x: 0, y: 0 })
  
  // Track current dimensions (may change during resize)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  
  // Snap guides
  const [guides, setGuides] = useState<SnapGuide[]>([])
  
  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startMouseX: 0,
    startMouseY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })
  
  // Resize state
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    handle: null,
    startMouseX: 0,
    startMouseY: 0,
    startWidth: 0,
    startHeight: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    aspectRatio: 1,
  })

  // Initialize on mount - capture original rect ONCE
  useEffect(() => {
    const rect = element.getBoundingClientRect()
    originalRectRef.current = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    }
    setDimensions({ width: rect.width, height: rect.height })
    setOffset({ x: 0, y: 0 })
  }, [element])

  // Calculate current visual rect = original + offset
  const visualRect: ElementRect = {
    x: originalRectRef.current.x + offset.x,
    y: originalRectRef.current.y + offset.y,
    width: dimensions.width,
    height: dimensions.height,
  }

  // Calculate snap guides
  const calculateSnapGuides = useCallback((x: number, y: number, w: number, h: number): SnapGuide[] => {
    if (!snapEnabled) return []
    
    const guides: SnapGuide[] = []
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Center guides
    const centerX = viewportWidth / 2
    const centerY = viewportHeight / 2
    const elementCenterX = x + w / 2
    const elementCenterY = y + h / 2
    
    // Snap to horizontal center
    if (Math.abs(elementCenterX - centerX) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: centerX,
        start: y,
        end: y + h,
      })
    }
    
    // Snap to vertical center
    if (Math.abs(elementCenterY - centerY) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: centerY,
        start: x,
        end: x + w,
      })
    }
    
    // Edge snaps
    if (Math.abs(x) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: 0, start: y, end: y + h })
    }
    if (Math.abs(x + w - viewportWidth) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: viewportWidth, start: y, end: y + h })
    }
    if (Math.abs(y) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: 0, start: x, end: x + w })
    }
    
    return guides
  }, [snapEnabled])

  // ==================== DRAG HANDLING ====================

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setDragState({
      isDragging: true,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    })
  }, [offset])

  // Drag effect
  useEffect(() => {
    if (!dragState.isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startMouseX
      const deltaY = e.clientY - dragState.startMouseY
      
      let newX = dragState.startOffsetX + deltaX
      let newY = dragState.startOffsetY + deltaY
      
      // Calculate snap
      const visualX = originalRectRef.current.x + newX
      const visualY = originalRectRef.current.y + newY
      const newGuides = calculateSnapGuides(visualX, visualY, dimensions.width, dimensions.height)
      setGuides(newGuides)
      
      // Apply snap
      if (newGuides.length > 0) {
        for (const guide of newGuides) {
          if (guide.type === 'vertical') {
            if (guide.position === 0 || guide.position === window.innerWidth) {
              newX = guide.position - originalRectRef.current.x + (guide.position === window.innerWidth ? -dimensions.width : 0)
            } else {
              newX = guide.position - dimensions.width / 2 - originalRectRef.current.x
            }
          } else {
            if (guide.position === 0) {
              newY = guide.position - originalRectRef.current.y
            } else {
              newY = guide.position - dimensions.height / 2 - originalRectRef.current.y
            }
          }
        }
      }
      
      // Update offset
      setOffset({ x: newX, y: newY })
      
      // Apply transform to element
      element.style.transform = `translate(${newX}px, ${newY}px)`
      element.style.position = 'relative'
    }

    const handleMouseUp = () => {
      setDragState(prev => ({ ...prev, isDragging: false }))
      setGuides([])
      document.body.style.userSelect = ''
    }

    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [dragState, element, dimensions, calculateSnapGuides])

  // ==================== RESIZE HANDLING ====================

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const aspectRatio = dimensions.width / dimensions.height
    
    setResizeState({
      isResizing: true,
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startWidth: dimensions.width,
      startHeight: dimensions.height,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      aspectRatio,
    })
  }, [dimensions, offset])

  // Resize effect
  useEffect(() => {
    if (!resizeState.isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeState.startMouseX
      const deltaY = e.clientY - resizeState.startMouseY
      
      let newWidth = resizeState.startWidth
      let newHeight = resizeState.startHeight
      let newOffsetX = resizeState.startOffsetX
      let newOffsetY = resizeState.startOffsetY
      
      // Calculate new dimensions based on handle
      const h = resizeState.handle || ''
      
      if (h.includes('e')) {
        newWidth = Math.max(MIN_SIZE, resizeState.startWidth + deltaX)
      } else if (h.includes('w')) {
        newWidth = Math.max(MIN_SIZE, resizeState.startWidth - deltaX)
      }
      
      if (h.includes('s')) {
        newHeight = Math.max(MIN_SIZE, resizeState.startHeight + deltaY)
      } else if (h.includes('n')) {
        newHeight = Math.max(MIN_SIZE, resizeState.startHeight - deltaY)
      }
      
      // Preserve aspect ratio for corner handles
      if (h.length === 2) { // Corner handles (nw, ne, sw, se)
        const widthBasedHeight = newWidth / resizeState.aspectRatio
        const heightBasedWidth = newHeight * resizeState.aspectRatio
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = widthBasedHeight
        } else {
          newWidth = heightBasedWidth
        }
      }
      
      // Adjust offset if resizing from left/top
      if (h.includes('w')) {
        const widthDiff = newWidth - resizeState.startWidth
        newOffsetX = resizeState.startOffsetX - widthDiff
      }
      if (h.includes('n')) {
        const heightDiff = newHeight - resizeState.startHeight
        newOffsetY = resizeState.startOffsetY - heightDiff
      }
      
      // Apply to element
      element.style.width = `${newWidth}px`
      element.style.height = `${newHeight}px`
      element.style.transform = `translate(${newOffsetX}px, ${newOffsetY}px)`
      element.style.position = 'relative'
      element.style.maxWidth = 'none'
      element.style.maxHeight = 'none'
      
      // Update state
      setDimensions({ width: newWidth, height: newHeight })
      setOffset({ x: newOffsetX, y: newOffsetY })
    }

    const handleMouseUp = () => {
      setResizeState(prev => ({ ...prev, isResizing: false, handle: null }))
      document.body.style.userSelect = ''
    }

    const handle = resizeState.handle || ''
    const cursor = handle.includes('e') || handle.includes('w') 
      ? (handle === 'e' || handle === 'w' ? 'ew-resize' : 'nwse-resize')
      : (handle === 'n' || handle === 's' ? 'ns-resize' : 'nwse-resize')
    
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [resizeState, element])

  // ==================== RENDER ====================

  const { x, y, width, height } = visualRect

  return createPortal(
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* Selection border - ALWAYS perfectly aligned */}
      <div
        className="absolute"
        style={{
          left: x,
          top: y,
          width,
          height,
          border: '2px solid #FF8C21',
          boxShadow: '0 0 0 1px rgba(255,140,33,0.3), 0 0 12px rgba(255,140,33,0.15)',
        }}
      />

      {/* Drag area */}
      <div
        className="absolute cursor-move"
        style={{
          left: x,
          top: y,
          width,
          height,
        }}
        onMouseDown={handleDragStart}
      />

      {/* Corner handles */}
      {CORNER_HANDLES.map(({ handle, cursor }) => {
        const isRight = handle.includes('e')
        const isBottom = handle.includes('s')
        return (
          <div
            key={handle}
            className="resize-handle absolute w-4 h-4 bg-white border-2 border-[#FF8C21] rounded-sm cursor-pointer"
            style={{
              left: isRight ? x + width : x,
              top: isBottom ? y + height : y,
              transform: 'translate(-50%, -50%)',
              cursor,
            }}
            onMouseDown={(e) => handleResizeStart(e, handle)}
          />
        )
      })}

      {/* Size label */}
      <div
        className="absolute pointer-events-none px-2 py-1 bg-[#FF8C21] text-white text-[11px] font-medium rounded"
        style={{
          left: x + width / 2,
          top: y + height + 10,
          transform: 'translateX(-50%)',
        }}
      >
        {Math.round(width)} × {Math.round(height)}
      </div>

      {/* Snap guides */}
      {guides.map((guide, i) => (
        <div
          key={i}
          className="absolute bg-[#FF8C21] pointer-events-none"
          style={
            guide.type === 'vertical'
              ? { left: guide.position - 0.5, top: guide.start, width: 1, height: guide.end - guide.start }
              : { top: guide.position - 0.5, left: guide.start, height: 1, width: guide.end - guide.start }
          }
        />
      ))}
    </div>,
    document.body
  )
}

// ==================== HOVER INDICATOR ====================

function HoverIndicator({ element }: { element: HTMLElement }) {
  const [rect, setRect] = useState<ElementRect>({ x: 0, y: 0, width: 0, height: 0 })

  useEffect(() => {
    const update = () => {
      const r = element.getBoundingClientRect()
      setRect({ x: r.left, y: r.top, width: r.width, height: r.height })
    }
    update()
    
    const observer = new MutationObserver(update)
    observer.observe(element, { attributes: true, subtree: true })
    
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [element])

  const label = element.getAttribute('data-edit-label') || element.getAttribute('data-edit-id') || ''

  return createPortal(
    <div
      className="fixed pointer-events-none z-[9989]"
      style={{
        left: rect.x - 2,
        top: rect.y - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        border: '2px dashed #FF8C21',
        borderRadius: 4,
      }}
    >
      <div
        className="absolute px-2 py-0.5 text-[10px] font-medium text-white bg-[#FF8C21] rounded whitespace-nowrap"
        style={{ transform: 'translateY(-100%)', marginTop: -4 }}
      >
        {label}
      </div>
    </div>,
    document.body
  )
}

// ==================== MAIN EDITOR OVERLAY ====================

function checkAuthCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('t4t-editor-auth=authorized')
}

export function VisualEditorOverlay() {
  const { isEditing, setIsEditing, selectedElement, setSelectedElement, openPanel, setOpenPanel, snapEnabled, setSnapEnabled } = useVisualEditor()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(checkAuthCookie())
  }, [])

  // Click handler - select elements
  const handleClick = useCallback((e: MouseEvent) => {
    if (!isEditing) return
    
    const target = e.target as HTMLElement
    
    // Ignore clicks on editor UI
    if (target.closest('[data-edit-panel]') ||
        target.closest('[data-edit-toolbar]') ||
        target.closest('[data-edit-modal]') ||
        target.closest('.resize-handle')) {
      return
    }
    
    // Find editable element - traverse UP to find data-edit-id
    let editable: HTMLElement | null = null
    let current: Node | null = target
    
    while (current && current !== document.body) {
      if (current instanceof HTMLElement && current.hasAttribute('data-edit-id')) {
        editable = current
        break
      }
      current = current.parentNode
    }
    
    if (editable) {
      e.preventDefault()
      e.stopPropagation()
      
      const id = editable.getAttribute('data-edit-id') || ''
      const type = editable.getAttribute('data-edit-type') || 'text'
      const label = editable.getAttribute('data-edit-label') || id
      
      let value = ''
      if (type === 'text') {
        value = editable.textContent?.trim() || ''
      } else if (type === 'image') {
        const img = editable.querySelector('img')
        value = img?.src || ''
      } else if (type === 'link') {
        value = editable.getAttribute('href') || ''
      }
      
      setSelectedElement({ id, type, label, value, element: editable })
      setOpenPanel(true)
    } else if (!target.closest('[data-edit-panel]') && !target.closest('[data-edit-toolbar]')) {
      setOpenPanel(false)
      setSelectedElement(null)
    }
  }, [isEditing, setSelectedElement, setOpenPanel])

  // Hover handler
  const handleMouseOver = useCallback((e: MouseEvent) => {
    if (!isEditing) return
    
    const target = e.target as HTMLElement
    let editable: HTMLElement | null = null
    let current: Node | null = target
    
    while (current && current !== document.body) {
      if (current instanceof HTMLElement && current.hasAttribute('data-edit-id')) {
        editable = current
        break
      }
      current = current.parentNode
    }
    
    setHoveredElement(editable)
  }, [isEditing])

  // Prevent navigation on links
  const handleLinkClick = useCallback((e: MouseEvent) => {
    if (!isEditing) return
    
    const target = e.target as HTMLElement
    const link = target.closest('a')
    
    if (link && !target.closest('[data-edit-id]') && !target.closest('[data-edit-modal]')) {
      e.preventDefault()
    }
  }, [isEditing])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSaveModal) {
          setShowSaveModal(false)
        } else if (openPanel) {
          setOpenPanel(false)
          setSelectedElement(null)
        } else if (isEditing) {
          setIsEditing(false)
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        setShowSaveModal(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, showSaveModal, openPanel])

  // Attach event listeners
  useEffect(() => {
    if (!isEditing) return
    
    document.addEventListener('click', handleClick, true)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('click', handleLinkClick, true)
    document.body.setAttribute('data-edit-mode', 'true')
    
    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('click', handleLinkClick, true)
      document.body.removeAttribute('data-edit-mode')
    }
  }, [isEditing, handleClick, handleMouseOver, handleLinkClick])

  const handleSave = async () => {
    setSaveStatus('saving')
    await new Promise(r => setTimeout(r, 1500))
    setSaveStatus('saved')
    setTimeout(() => {
      setShowSaveModal(false)
      setSaveStatus('idle')
    }, 1000)
  }

  return (
    <>
      {/* Toolbar */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            data-edit-toolbar
            className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] shadow-xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <span className="text-white font-bold text-lg">Visual Editor</span>
                  <p className="text-white/70 text-xs hidden sm:block">Click to select • Drag to move • Corners to resize</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Snap toggle */}
                <button
                  onClick={() => setSnapEnabled(!snapEnabled)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    snapEnabled ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span className="hidden sm:inline">{snapEnabled ? 'Snap On' : 'Snap Off'}</span>
                </button>

                {/* Save button */}
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-4 py-1.5 bg-white text-[#FF8C21] hover:bg-white/95 rounded-lg text-sm font-bold transition flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Save</span>
                </button>

                {/* Logout */}
                <button
                  onClick={async () => {
                    await fetch('/api/editor-auth/logout', { method: 'POST' })
                    window.location.href = '/'
                  }}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition flex items-center gap-1.5"
                  title="Logout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>

                {/* Close */}
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover indicator */}
      {isEditing && hoveredElement && hoveredElement !== selectedElement?.element && (
        <HoverIndicator element={hoveredElement} />
      )}

      {/* Selection overlay */}
      {isEditing && selectedElement && (
        <ElementSelectionOverlay element={selectedElement.element} />
      )}

      {/* Edit Panel */}
      <AnimatePresence>
        {isEditing && openPanel && selectedElement && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            data-edit-panel
            className="fixed right-4 top-20 z-[9997] w-80 bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedElement.label}</h3>
                  <p className="text-white/70 text-xs capitalize">{selectedElement.type}</p>
                </div>
                <button
                  data-edit-modal
                  onClick={() => { setOpenPanel(false); setSelectedElement(null) }}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5">
              {selectedElement.type === 'text' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Text Content</label>
                  <textarea
                    defaultValue={selectedElement.value}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF8C21] focus:border-transparent text-gray-800 resize-none"
                    rows={4}
                    onChange={(e) => {
                      if (selectedElement.element) {
                        selectedElement.element.textContent = e.target.value
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">Changes apply immediately</p>
                </div>
              )}

              {selectedElement.type === 'image' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Image</label>
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl space-y-1">
                    <p><strong>Drag corners</strong> to resize proportionally</p>
                    <p><strong>Drag center</strong> to move</p>
                    <p><strong>Toggle Snap</strong> for alignment guides</p>
                  </div>
                  <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                    {selectedElement.value && (
                      <img src={selectedElement.value} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              )}

              {selectedElement.type === 'link' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Link URL</label>
                  <input
                    type="url"
                    defaultValue={selectedElement.value}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF8C21] focus:border-transparent text-gray-800"
                    onChange={(e) => {
                      if (selectedElement.element) {
                        selectedElement.element.setAttribute('href', e.target.value)
                      }
                    }}
                  />
                </div>
              )}

              {selectedElement.type === 'section' && (
                <p className="text-gray-600 text-sm">Click on elements inside this section to edit them.</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                data-edit-modal
                onClick={() => setShowSaveModal(true)}
                className="w-full py-3 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-xl font-bold hover:opacity-90 transition"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB - only for authenticated users */}
      {!isEditing && isAuthenticated && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsEditing(true)}
          data-edit-toolbar
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-full shadow-xl flex items-center justify-center"
          title="Edit Mode"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </motion.button>
      )}

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-edit-modal
            className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => saveStatus === 'idle' && setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              data-edit-modal
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] flex items-center justify-center">
                {saveStatus === 'saving' ? (
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : saveStatus === 'saved' ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
              </div>

              <h3 className="text-xl font-bold text-center mb-2">
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save & Publish'}
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                {saveStatus === 'saved' 
                  ? 'Changes published successfully.' 
                  : 'Save changes to the CMS.'}
              </p>

              {saveStatus === 'idle' && (
                <div className="space-y-3">
                  <button
                    data-edit-modal
                    onClick={handleSave}
                    className="w-full py-3 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-xl font-bold"
                  >
                    Save & Publish
                  </button>
                  <button
                    data-edit-modal
                    onClick={() => setShowSaveModal(false)}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isEditing && <div className="h-16" />}
    </>
  )
}
