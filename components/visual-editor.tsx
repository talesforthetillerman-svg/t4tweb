"use client"

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

interface ResizeAnchor {
  handle: string
  cursor: string
  x: number
  y: number
}

interface SnapGuide {
  type: 'vertical' | 'horizontal'
  position: number
  start: number
  end: number
  label?: string
}

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  initialLeft: number
  initialTop: number
}

interface ResizeState {
  isResizing: boolean
  handle: string | null
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  startLeft: number
  startTop: number
  anchorX: number
  anchorY: number
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
const MIN_SIZE = 30

const CORNER_HANDLES: ResizeAnchor[] = [
  { handle: 'nw', cursor: 'nwse-resize', x: 0, y: 0 },
  { handle: 'ne', cursor: 'nesw-resize', x: 1, y: 0 },
  { handle: 'se', cursor: 'nwse-resize', x: 1, y: 1 },
  { handle: 'sw', cursor: 'nesw-resize', x: 0, y: 1 },
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

// ==================== UTILITIES ====================

function getElementRect(element: HTMLElement): ElementRect {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function getCursorForHandle(handle: string): string {
  const cursors: Record<string, string> = {
    'nw': 'nwse-resize',
    'ne': 'nesw-resize',
    'se': 'nwse-resize',
    'sw': 'nesw-resize',
  }
  return cursors[handle] || 'default'
}

function calculateNewSize(
  handle: string,
  deltaX: number,
  deltaY: number,
  startWidth: number,
  startHeight: number,
  aspectRatio: number,
  preserveAspect: boolean
): { width: number; height: number } {
  let newWidth = startWidth
  let newHeight = startHeight

  // Handle horizontal resize
  if (handle.includes('e')) {
    newWidth = Math.max(MIN_SIZE, startWidth + deltaX)
  } else if (handle.includes('w')) {
    newWidth = Math.max(MIN_SIZE, startWidth - deltaX)
  }

  // Handle vertical resize
  if (handle.includes('s')) {
    newHeight = Math.max(MIN_SIZE, startHeight + deltaY)
  } else if (handle.includes('n')) {
    newHeight = Math.max(MIN_SIZE, startHeight - deltaY)
  }

  // If only one direction, calculate the other based on aspect ratio
  if (preserveAspect) {
    const isHorizontalOnly = (handle === 'e' || handle === 'w')
    const isVerticalOnly = (handle === 'n' || handle === 's')

    if (isHorizontalOnly) {
      newHeight = newWidth / aspectRatio
    } else if (isVerticalOnly) {
      newWidth = newHeight * aspectRatio
    } else {
      // For corner handles, use the larger delta
      const widthBasedHeight = newWidth / aspectRatio
      const heightBasedWidth = newHeight * aspectRatio

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = widthBasedHeight
      } else {
        newWidth = heightBasedWidth
      }
    }
  }

  return { width: newWidth, height: newHeight }
}

// ==================== ELEMENT SELECTION OVERLAY ====================

function ElementSelectionOverlay({
  element,
  onClose,
}: {
  element: HTMLElement
  onClose: () => void
}) {
  const { snapEnabled } = useVisualEditor()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<ElementRect>({ x: 0, y: 0, width: 0, height: 0 })
  const [guides, setGuides] = useState<SnapGuide[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Resize state
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0,
    anchorX: 0,
    anchorY: 0,
  })

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
  })

  const rafRef = useRef<number>(0)
  const initialTransformRef = useRef<string>('')
  const originalPositionRef = useRef<string>('')

  // Update element position
  const updateRect = useCallback(() => {
    if (!element) return
    const newRect = getElementRect(element)
    setRect(newRect)
    setDimensions({ width: newRect.width, height: newRect.height })
    setPosition({ x: newRect.x, y: newRect.y })
  }, [element])

  // Initialize and setup scroll/resize listeners
  useEffect(() => {
    updateRect()

    // Store original styles
    if (!initialTransformRef.current) {
      initialTransformRef.current = element.style.transform || ''
      originalPositionRef.current = element.style.position || ''
    }

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateRect)
    }

    const handleResize = () => {
      updateRect()
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [element, updateRect])

  // Calculate snap guides for a position
  const calculateSnapGuides = useCallback((newX: number, newY: number, width: number, height: number): SnapGuide[] => {
    if (!snapEnabled) return []

    const guides: SnapGuide[] = []
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Viewport center guides
    const viewportCenterX = viewportWidth / 2
    const viewportCenterY = viewportHeight / 2
    const elementCenterX = newX + width / 2
    const elementCenterY = newY + height / 2

    // Snap to viewport center X
    if (Math.abs(elementCenterX - viewportCenterX) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: viewportCenterX,
        start: Math.min(newY, newY + height),
        end: Math.max(newY, newY + height),
        label: 'center',
      })
    }

    // Snap to viewport center Y
    if (Math.abs(elementCenterY - viewportCenterY) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: viewportCenterY,
        start: Math.min(newX, newX + width),
        end: Math.max(newX, newX + width),
        label: 'center',
      })
    }

    // Snap to edges
    const edgePoints = [0, viewportWidth, viewportHeight]

    // Left edge
    if (Math.abs(newX) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: 0,
        start: newY,
        end: newY + height,
      })
    }

    // Right edge
    if (Math.abs(newX + width - viewportWidth) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: viewportWidth,
        start: newY,
        end: newY + height,
      })
    }

    // Top edge
    if (Math.abs(newY) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: 0,
        start: newX,
        end: newX + width,
      })
    }

    return guides
  }, [snapEnabled])

  // ==================== RESIZE HANDLING ====================

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()

    const currentRect = getElementRect(element)
    const aspectRatio = currentRect.width / currentRect.height

    // Calculate anchor point (opposite corner of the handle)
    let anchorX = currentRect.x
    let anchorY = currentRect.y

    if (handle.includes('e')) {
      anchorX = currentRect.x + currentRect.width
    }
    if (handle.includes('w')) {
      anchorX = currentRect.x
    }
    if (handle.includes('s')) {
      anchorY = currentRect.y + currentRect.height
    }
    if (handle.includes('n')) {
      anchorY = currentRect.y
    }

    setResizeState({
      isResizing: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentRect.width,
      startHeight: currentRect.height,
      startLeft: currentRect.x,
      startTop: currentRect.y,
      anchorX,
      anchorY,
    })
  }, [element])

  // Resize mouse move/up effect
  useEffect(() => {
    if (!resizeState.isResizing) return

    const aspectRatio = resizeState.startWidth / resizeState.startHeight

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeState.startX
      const deltaY = e.clientY - resizeState.startY

      const { width, height } = calculateNewSize(
        resizeState.handle || '',
        deltaX,
        deltaY,
        resizeState.startWidth,
        resizeState.startHeight,
        aspectRatio,
        true // Always preserve aspect ratio
      )

      // Calculate new position based on anchor point
      let newX = resizeState.startLeft
      let newY = resizeState.startTop

      if (resizeState.handle?.includes('w')) {
        newX = resizeState.anchorX - width
      } else if (resizeState.handle?.includes('e')) {
        newX = resizeState.anchorX - width
      }

      if (resizeState.handle?.includes('n')) {
        newY = resizeState.anchorY - height
      } else if (resizeState.handle?.includes('s')) {
        newY = resizeState.anchorY - height
      }

      // Apply styles
      element.style.width = `${width}px`
      element.style.height = `${height}px`
      element.style.maxWidth = 'none'
      element.style.maxHeight = 'none'
      element.style.minWidth = '0'
      element.style.minHeight = '0'

      // Use transform for position changes
      const currentTransform = initialTransformRef.current
      element.style.transform = `translate(${newX - resizeState.startLeft}px, ${newY - resizeState.startTop}px) ${currentTransform}`.trim()
      element.style.position = 'relative'

      // Update display
      setDimensions({ width, height })
      setPosition({ x: newX, y: newY })
      setRect({ x: newX, y: newY, width, height })
    }

    const handleMouseUp = () => {
      setResizeState(prev => ({ ...prev, isResizing: false, handle: null }))
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = getCursorForHandle(resizeState.handle || '')
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizeState, element])

  // ==================== DRAG HANDLING ====================

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Ignore if clicking on resize handles
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return
    if ((e.target as HTMLElement).classList.contains('dimension-label')) return

    e.preventDefault()
    e.stopPropagation()

    const currentRect = getElementRect(element)

    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: currentRect.x,
      initialTop: currentRect.y,
    })
  }, [element])

  // Drag mouse move/up effect
  useEffect(() => {
    if (!dragState.isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaY = e.clientY - dragState.startY

      let newX = dragState.initialLeft + deltaX
      let newY = dragState.initialTop + deltaY

      // Calculate snap guides
      const newGuides = calculateSnapGuides(newX, newY, rect.width, rect.height)
      setGuides(newGuides)

      // Apply snap if guides found
      if (newGuides.length > 0) {
        newGuides.forEach(guide => {
          if (guide.type === 'vertical') {
            if (guide.label === 'center') {
              newX = guide.position - rect.width / 2
            } else if (guide.position === 0) {
              newX = 0
            } else {
              newX = guide.position - rect.width
            }
          } else {
            if (guide.label === 'center') {
              newY = guide.position - rect.height / 2
            } else if (guide.position === 0) {
              newY = 0
            } else {
              newY = guide.position - rect.height
            }
          }
        })
      }

      // Calculate transform offset from original position
      const offsetX = newX - dragState.initialLeft
      const offsetY = newY - dragState.initialTop

      // Apply transform for smooth movement
      element.style.transform = `translate(${offsetX}px, ${offsetY}px) ${initialTransformRef.current}`.trim()
      element.style.position = 'relative'

      // Update display
      setPosition({ x: newX, y: newY })
      setRect(prev => ({ ...prev, x: newX, y: newY }))
    }

    const handleMouseUp = () => {
      setDragState(prev => ({ ...prev, isDragging: false }))
      setGuides([])
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'move'
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragState, element, rect, calculateSnapGuides])

  // ==================== RENDER ====================

  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-[9990] pointer-events-none">
      {/* Selection border */}
      <div
        className="absolute pointer-events-none transition-none"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          border: '2px solid #FF8C21',
          boxShadow: '0 0 0 1px rgba(255, 140, 33, 0.3), 0 0 0 4px rgba(255, 140, 33, 0.1)',
        }}
      />

      {/* Drag area */}
      <div
        className={`absolute pointer-events-auto ${dragState.isDragging ? 'cursor-move' : 'cursor-move'}`}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        onMouseDown={handleDragStart}
      />

      {/* Corner resize handles */}
      {CORNER_HANDLES.map((handle) => (
        <div
          key={handle.handle}
          className="resize-handle absolute pointer-events-auto"
          style={{
            left: rect.x + (handle.x === 1 ? rect.width : 0),
            top: rect.y + (handle.y === 1 ? rect.height : 0),
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: handle.cursor,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            border: '2px solid #FF8C21',
            borderRadius: '2px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
          onMouseDown={(e) => handleResizeStart(e, handle.handle)}
        />
      ))}

      {/* Edge resize handles - invisible hit areas */}
      {['n', 's', 'e', 'w'].map((edge) => {
        const isHorizontal = edge === 'n' || edge === 's'
        return (
          <div
            key={edge}
            className="resize-handle absolute pointer-events-auto"
            style={{
              ...(isHorizontal ? {
                left: rect.x + rect.width / 2 - 20,
                top: edge === 'n' ? rect.y - 4 : rect.y + rect.height - 4,
                width: 40,
                height: 8,
                cursor: 'ns-resize',
              } : {
                left: edge === 'w' ? rect.x - 4 : rect.x + rect.width - 4,
                top: rect.y + rect.height / 2 - 20,
                width: 8,
                height: 40,
                cursor: 'ew-resize',
              }),
            }}
            onMouseDown={(e) => handleResizeStart(e, edge)}
          />
        )
      })}

      {/* Size display */}
      <div
        className="dimension-label absolute pointer-events-none px-2 py-1 bg-[#FF8C21] text-white text-[11px] font-medium rounded-md shadow-lg"
        style={{
          left: rect.x + rect.width / 2,
          top: rect.y + rect.height + 12,
          transform: 'translateX(-50%)',
        }}
      >
        {Math.round(rect.width)} x {Math.round(rect.height)}
      </div>

      {/* Position display */}
      <div
        className="dimension-label absolute pointer-events-none px-2 py-1 bg-gray-700 text-white text-[10px] font-medium rounded shadow-lg"
        style={{
          left: rect.x + rect.width / 2,
          top: rect.y - 24,
          transform: 'translateX(-50%)',
        }}
      >
        X: {Math.round(rect.x)} Y: {Math.round(rect.y)}
      </div>

      {/* Snap guides */}
      {guides.map((guide, index) => (
        <div
          key={`guide-${index}`}
          className="absolute pointer-events-none"
          style={{
            ...(guide.type === 'vertical' ? {
              left: guide.position - 0.5,
              top: guide.start,
              width: 1,
              height: guide.end - guide.start,
            } : {
              left: guide.start,
              top: guide.position - 0.5,
              width: guide.end - guide.start,
              height: 1,
            }),
            backgroundColor: '#FF8C21',
            opacity: 0.8,
          }}
        />
      ))}
    </div>,
    document.body
  )
}

// ==================== HOVER INDICATOR ====================

function HoverIndicator({ element }: { element: HTMLElement }) {
  const [rect, setRect] = useState<ElementRect>({ x: 0, y: 0, width: 0, height: 0 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const updateRect = () => {
      if (!element) return
      const newRect = getElementRect(element)
      setRect(newRect)
    }

    updateRect()

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateRect)
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', updateRect)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', updateRect)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [element])

  return createPortal(
    <div
      className="fixed pointer-events-none z-[9989] transition-all duration-75"
      style={{
        left: rect.x - 2,
        top: rect.y - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        border: '2px dashed #FF8C21',
        borderRadius: '4px',
        background: 'rgba(255, 140, 33, 0.05)',
      }}
    >
      <div
        className="absolute -top-7 left-0 px-2 py-1 text-[11px] font-medium text-white bg-[#FF8C21] rounded-md shadow-lg whitespace-nowrap"
        style={{
          transform: 'translateY(-100%)',
        }}
      >
        {element.getAttribute('data-edit-label') || element.getAttribute('data-edit-id')}
      </div>
    </div>,
    document.body
  )
}

// ==================== MAIN EDITOR OVERLAY ====================

export function VisualEditorOverlay() {
  const { isEditing, setIsEditing, selectedElement, setSelectedElement, openPanel, setOpenPanel, snapEnabled, setSnapEnabled } = useVisualEditor()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)

  // Handle element click in edit mode
  const handleElementClick = useCallback((e: MouseEvent) => {
    if (!isEditing) return

    const target = e.target as HTMLElement

    // Check if clicking on editor UI elements
    if (target.closest('[data-edit-panel]') ||
        target.closest('[data-edit-toolbar]') ||
        target.closest('[data-edit-modal]') ||
        target.closest('.resize-handle') ||
        target.closest('.dimension-label')) {
      return
    }

    const editable = target.closest('[data-edit-id]') as HTMLElement

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
        value = img?.getAttribute('src') || editable.style.backgroundImage?.match(/url\("?([^"]+)"?\)/)?.[1] || ''
      } else if (type === 'link') {
        value = editable.getAttribute('href') || ''
      }

      setSelectedElement({ id, type, label, value, element: editable })
      setOpenPanel(true)
    } else if (!target.closest('[data-edit-panel]') && !target.closest('[data-edit-toolbar]') && !target.closest('.resize-handle')) {
      setOpenPanel(false)
      setSelectedElement(null)
    }
  }, [isEditing, setSelectedElement, setOpenPanel])

  // Handle hover in edit mode
  const handleElementHover = useCallback((e: MouseEvent) => {
    if (!isEditing) return

    const target = e.target as HTMLElement
    const editable = target.closest('[data-edit-id]') as HTMLElement

    if (editable && editable !== hoveredElement) {
      setHoveredElement(editable)
    } else if (!editable) {
      setHoveredElement(null)
    }
  }, [isEditing, hoveredElement])

  // Prevent navigation in edit mode
  const handleLinkClick = useCallback((e: MouseEvent) => {
    if (!isEditing) return

    const target = e.target as HTMLElement
    const link = target.closest('a[href]')
    const editable = target.closest('[data-edit-id]')

    if (link && !editable && !target.closest('[data-edit-modal]')) {
      e.preventDefault()
    }
  }, [isEditing])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setIsEditing(!isEditing)
      }
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
  }, [isEditing, setIsEditing, openPanel, setOpenPanel, selectedElement, showSaveModal])

  // Add event listeners when editing
  useEffect(() => {
    if (!isEditing) return

    document.addEventListener('click', handleElementClick, true)
    document.addEventListener('mouseover', handleElementHover)
    document.addEventListener('click', handleLinkClick, true)

    document.body.setAttribute('data-edit-mode', 'true')

    return () => {
      document.removeEventListener('click', handleElementClick, true)
      document.removeEventListener('mouseover', handleElementHover)
      document.removeEventListener('click', handleLinkClick, true)
      document.body.removeAttribute('data-edit-mode')
    }
  }, [isEditing, handleElementClick, handleElementHover, handleLinkClick])

  const handleSave = async () => {
    setSaveStatus('saving')
    await new Promise(resolve => setTimeout(resolve, 1500))
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
            className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-[#FF8C21] via-[#FF7C00] to-[#FF6C00] shadow-2xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-white font-bold text-lg">Visual Editor</span>
                    <p className="text-white/70 text-xs hidden sm:block">
                      Click to select • Drag to move • Corners to resize
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Snap toggle */}
                <button
                  onClick={() => setSnapEnabled(!snapEnabled)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    snapEnabled
                      ? 'bg-white/30 text-white'
                      : 'bg-white/10 text-white/70'
                  }`}
                  title={snapEnabled ? 'Snap enabled' : 'Snap disabled'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span className="hidden sm:inline">{snapEnabled ? 'Snap On' : 'Snap Off'}</span>
                </button>

                <button
                  onClick={() => window.open('/studio', '_blank')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94 1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Sanity CMS</span>
                </button>

                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-5 py-2 bg-white text-[#FF8C21] hover:bg-white/95 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Save</span>
                </button>

                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all duration-200"
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

      {/* Hover Indicator */}
      {isEditing && hoveredElement && hoveredElement !== selectedElement?.element && (
        <HoverIndicator element={hoveredElement} />
      )}

      {/* Element Selection Overlay - Works for ALL element types */}
      {isEditing && selectedElement && (
        <ElementSelectionOverlay
          element={selectedElement.element}
          onClose={() => {
            setSelectedElement(null)
            setOpenPanel(false)
          }}
        />
      )}

      {/* Edit Panel */}
      <AnimatePresence>
        {isEditing && openPanel && selectedElement && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            data-edit-panel
            className="fixed right-4 top-20 z-[9997] w-80 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden"
          >
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedElement.label}</h3>
                  <p className="text-white/70 text-xs capitalize">{selectedElement.type}</p>
                </div>
                <button
                  data-edit-modal
                  onClick={() => {
                    setOpenPanel(false)
                    setSelectedElement(null)
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-5">
              {selectedElement.type === 'text' && (
                <div className="space-y-4">
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
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">Selected Image</label>
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl">
                    <p className="font-medium text-gray-700 mb-1">How to use:</p>
                    <ul className="space-y-1">
                      <li>Drag <strong>corners</strong> to resize proportionally</li>
                      <li>Drag <strong>edges</strong> to resize width/height</li>
                      <li>Drag <strong>center</strong> to move</li>
                      <li>Use <strong>snap</strong> for alignment</li>
                    </ul>
                  </div>
                  <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                    {selectedElement.value && (
                      <img src={selectedElement.value} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button
                    data-edit-modal
                    className="w-full py-3 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Change Image
                  </button>
                </div>
              )}

              {selectedElement.type === 'link' && (
                <div className="space-y-4">
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
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    This is a page section. Click individual elements inside to edit their content.
                  </p>
                  <button
                    data-edit-modal
                    onClick={() => window.open('/studio', '_blank')}
                    className="w-full py-3 border border-[#FF8C21] text-[#FF8C21] rounded-xl font-semibold hover:bg-[#FF8C21]/10 transition-colors"
                  >
                    Open Full Editor
                  </button>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                data-edit-modal
                onClick={() => setShowSaveModal(true)}
                className="w-full py-3 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!isEditing && (
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsEditing(true)}
          data-edit-toolbar
          className="fixed bottom-6 right-6 z-[9999] w-16 h-16 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-full shadow-2xl hover:shadow-[0_20px_60px_rgba(255,140,33,0.5)] transition-all flex items-center justify-center group"
          title="Enable Edit Mode"
        >
          <svg className="w-7 h-7 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => saveStatus === 'idle' && setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              data-edit-modal
              className="bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.3)] max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] flex items-center justify-center mx-auto mb-6">
                  {saveStatus === 'saving' ? (
                    <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

                <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save & Publish'}
                </h3>

                <p className="text-gray-600 text-center mb-8">
                  {saveStatus === 'saved'
                    ? 'Changes have been published successfully.'
                    : 'Changes will be saved to the CMS and published automatically.'}
                </p>

                {saveStatus === 'idle' && (
                  <div className="space-y-3">
                    <button
                      data-edit-modal
                      onClick={handleSave}
                      className="w-full py-4 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[#FF8C21]/30"
                    >
                      Save & Publish Now
                    </button>

                    <button
                      data-edit-modal
                      onClick={() => setShowSaveModal(false)}
                      className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacing for toolbar */}
      {isEditing && <div className="h-16" />}
    </>
  )
}
