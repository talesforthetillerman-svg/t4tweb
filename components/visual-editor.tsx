"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

// ==================== EDITABLE ELEMENT MODEL ====================

interface EditableElementData {
  id: string
  type: 'button' | 'link' | 'image' | 'box' | 'section' | 'logo' | 'text' | 'video'
  label: string
  parentId: string | null
  element: HTMLElement | null
  originalRect: DOMRect | null
  transform: { x: number; y: number }
  dimensions: { width: number; height: number }
}

interface VisualEditorContextType {
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  openPanel: boolean
  setOpenPanel: (open: boolean) => void
  snapEnabled: boolean
  setSnapEnabled: (value: boolean) => void
  editableElements: Map<string, EditableElementData>
  registerEditable: (data: EditableElementData) => void
  unregisterEditable: (id: string) => void
  getElementById: (id: string) => EditableElementData | undefined
  getEditableAtPosition: (x: number, y: number) => EditableElementData | null
}

// ==================== CONSTANTS ====================

const MIN_SIZE = 40
const SNAP_THRESHOLD = 8
const CORNER_HANDLES = [
  { handle: 'nw', cursor: 'nwse-resize' },
  { handle: 'ne', cursor: 'nesw-resize' },
  { handle: 'se', cursor: 'nwse-resize' },
  { handle: 'sw', cursor: 'nesw-resize' },
]
const SIDE_HANDLES = [
  { handle: 'n', cursor: 'ns-resize' },
  { handle: 's', cursor: 'ns-resize' },
  { handle: 'e', cursor: 'ew-resize' },
  { handle: 'w', cursor: 'ew-resize' },
]

// ==================== CONTEXT ====================

const VisualEditorContext = createContext<VisualEditorContextType>({
  isEditing: false,
  setIsEditing: () => {},
  selectedId: null,
  setSelectedId: () => {},
  openPanel: false,
  setOpenPanel: () => {},
  snapEnabled: true,
  setSnapEnabled: () => {},
  editableElements: new Map(),
  registerEditable: () => {},
  unregisterEditable: () => {},
  getElementById: () => undefined,
  getEditableAtPosition: () => null,
})

export function useVisualEditor() {
  return useContext(VisualEditorContext)
}

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openPanel, setOpenPanel] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [editableElements, setEditableElements] = useState<Map<string, EditableElementData>>(new Map())

  const registerEditable = useCallback((data: EditableElementData) => {
    setEditableElements(prev => {
      const next = new Map(prev)
      next.set(data.id, data)
      return next
    })
  }, [])

  const unregisterEditable = useCallback((id: string) => {
    setEditableElements(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const getElementById = useCallback((id: string) => {
    return editableElements.get(id)
  }, [editableElements])

  function getEditableFromDOM(x: number, y: number): EditableElementData | null {
    const directTarget = document.elementFromPoint(x, y)
    if (directTarget instanceof HTMLElement) {
      const el = directTarget
      const id = el.getAttribute('data-edit-id') || el.getAttribute('data-editable') || ''
      const rawType = el.getAttribute('data-edit-type') || el.getAttribute('data-editable-type') || 'text'
      const label = el.getAttribute('data-edit-label') || el.getAttribute('data-editable-label') || id
      
      if (id) {
        let typeCategory: string = rawType
        if (rawType === 'link') typeCategory = 'link'
        else if (rawType === 'button') typeCategory = 'button'
        else if (rawType === 'image') typeCategory = 'image'
        else if (rawType === 'section') typeCategory = 'section'
        else typeCategory = 'text'
        
        return {
          id,
          type: typeCategory as EditableElementData['type'],
          label,
          parentId: null,
          element: el,
          originalRect: el.getBoundingClientRect(),
          transform: { x: 0, y: 0 },
          dimensions: { width: el.offsetWidth, height: el.offsetHeight },
        }
      }
    }
    
    const point = document.elementsFromPoint(x, y)
    for (const el of point) {
      if (el instanceof HTMLElement) {
        const id = el.getAttribute('data-edit-id') || el.getAttribute('data-editable') || ''
        const rawType = el.getAttribute('data-edit-type') || el.getAttribute('data-editable-type') || 'text'
        const label = el.getAttribute('data-edit-label') || el.getAttribute('data-editable-label') || id
        
        if (id) {
          let typeCategory: string = rawType
          if (rawType === 'link') typeCategory = 'link'
          else if (rawType === 'button') typeCategory = 'button'
          else if (rawType === 'image') typeCategory = 'image'
          else if (rawType === 'section') typeCategory = 'section'
          else typeCategory = 'text'
          
          return {
            id,
            type: typeCategory as EditableElementData['type'],
            label,
            parentId: null,
            element: el,
            originalRect: el.getBoundingClientRect(),
            transform: { x: 0, y: 0 },
            dimensions: { width: el.offsetWidth, height: el.offsetHeight },
          }
        }
      }
    }
    
    return null
  }

  const getEditableAtPosition = useCallback((x: number, y: number): EditableElementData | null => {
    const elements = Array.from(editableElements.values())
    
    const elementsAtPoint = elements.filter(el => {
      if (!el.element) return false
      const rect = el.element.getBoundingClientRect()
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    })

    if (elementsAtPoint.length > 0) {
      const typePriority: Record<string, number> = {
        button: 1,
        link: 2,
        text: 3,
        box: 4,
        image: 5,
        video: 6,
        logo: 7,
        section: 8,
      }

      elementsAtPoint.sort((a, b) => {
        const typeDiff = (typePriority[a.type] || 99) - (typePriority[b.type] || 99)
        if (typeDiff !== 0) return typeDiff
        const depthA = getDepth(a.element)
        const depthB = getDepth(b.element)
        return depthB - depthA
      })

      return elementsAtPoint[0]
    }

    return getEditableFromDOM(x, y)
  }, [editableElements, getEditableFromDOM])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('editMode') === 'true' || window.location.pathname === '/editor') {
      setIsEditing(true)
    }
  }, [])

  return (
    <VisualEditorContext.Provider
      value={{
        isEditing,
        setIsEditing,
        selectedId,
        setSelectedId,
        openPanel,
        setOpenPanel,
        snapEnabled,
        setSnapEnabled,
        editableElements,
        registerEditable,
        unregisterEditable,
        getElementById,
        getEditableAtPosition,
      }}
    >
      {children}
    </VisualEditorContext.Provider>
  )
}

function getDepth(element: HTMLElement | null): number {
  if (!element) return 0
  let depth = 0
  let current: Node | null = element
  while (current && current !== document.body) {
    depth++
    current = current.parentNode
  }
  return depth
}

// ==================== UTILITY FUNCTIONS ====================

function isEditorUI(element: HTMLElement): boolean {
  return !!(
    element.closest('[data-edit-panel]') ||
    element.closest('[data-edit-toolbar]') ||
    element.closest('[data-edit-modal]') ||
    element.closest('[data-ve-overlay]')
  )
}

// ==================== SELECTION OVERLAY ====================

interface SelectionOverlayProps {
  element: EditableElementData
  onDragStart: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent, handle: string) => void
}

function SelectionOverlay({ element, onDragStart, onResizeStart }: SelectionOverlayProps) {
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  useEffect(() => {
    if (!element.element) return
    
    const update = () => {
      const r = element.element!.getBoundingClientRect()
      setRect({
        x: r.left + element.transform.x,
        y: r.top + element.transform.y,
        width: element.dimensions.width || r.width,
        height: element.dimensions.height || r.height,
      })
    }
    update()
    
    const observer = new ResizeObserver(update)
    observer.observe(element.element)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [element.element, element.transform.x, element.transform.y, element.dimensions.width, element.dimensions.height])

  if (!rect) return null

  return createPortal(
    <div data-ve-overlay className="ve-overlay fixed inset-0 pointer-events-none z-[9990]">
      <div
        className="absolute pointer-events-auto cursor-move"
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, touchAction: 'none' }}
        onPointerDown={onDragStart}
      />
      
      <div
        className="absolute pointer-events-none"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          border: '2px solid #FF8C21',
          boxShadow: '0 0 0 1px rgba(255,140,33,0.3), 0 0 12px rgba(255,140,33,0.15)',
        }}
      />
      
      {CORNER_HANDLES.map(({ handle, cursor }) => {
        const isRight = handle.includes('e')
        const isBottom = handle.includes('s')
        return (
          <div
            key={handle}
            className="absolute w-4 h-4 bg-white border-2 border-[#FF8C21] rounded-sm pointer-events-auto"
            style={{
              left: isRight ? rect.x + rect.width : rect.x,
              top: isBottom ? rect.y + rect.height : rect.y,
              transform: `translate(${isRight ? '-50%' : '50%'}, ${isBottom ? '-50%' : '50%'})`,
              cursor,
            }}
            onPointerDown={(e) => onResizeStart(e, handle)}
          />
        )
      })}

      {SIDE_HANDLES.map(({ handle, cursor }) => {
        const isTop = handle === 'n'
        const isBottom = handle === 's'
        const isLeft = handle === 'w'
        const isRight = handle === 'e'
        
        if (isTop || isBottom) {
          return (
            <div
              key={handle}
              className="absolute w-8 h-4 bg-white border-2 border-[#FF8C21] rounded-sm pointer-events-auto"
              style={{
                left: rect.x + rect.width / 2,
                top: isTop ? rect.y : rect.y + rect.height,
                transform: 'translate(-50%, -50%)',
                cursor,
              }}
              onPointerDown={(e) => onResizeStart(e, handle)}
            />
          )
        }
        
        if (isLeft || isRight) {
          return (
            <div
              key={handle}
              className="absolute w-4 h-8 bg-white border-2 border-[#FF8C21] rounded-sm pointer-events-auto"
              style={{
                left: isLeft ? rect.x : rect.x + rect.width,
                top: rect.y + rect.height / 2,
                transform: 'translate(-50%, -50%)',
                cursor,
              }}
              onPointerDown={(e) => onResizeStart(e, handle)}
            />
          )
        }
        
        return null
      })}

      <div
        className="absolute pointer-events-none px-2 py-1 bg-[#FF8C21] text-white text-[11px] font-medium rounded"
        style={{ left: rect.x + rect.width / 2, top: rect.y + rect.height + 10, transform: 'translateX(-50%)' }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </div>
    </div>,
    document.body
  )
}

// ==================== HOVER INDICATOR ====================

function HoverIndicator({ element }: { element: EditableElementData }) {
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 })

  useEffect(() => {
    if (!element.element) return
    
    const update = () => {
      const r = element.element!.getBoundingClientRect()
      setRect({ x: r.left, y: r.top, width: r.width, height: r.height })
    }
    update()
    
    const observer = new ResizeObserver(update)
    observer.observe(element.element)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [element.element])

  return createPortal(
    <div
      data-ve-overlay
      className="ve-overlay fixed pointer-events-none z-[9989]"
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
        {element.label}
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
  const {
    isEditing,
    setIsEditing,
    selectedId,
    setSelectedId,
    openPanel,
    setOpenPanel,
    snapEnabled,
    setSnapEnabled,
    editableElements,
    registerEditable,
    getElementById,
    getEditableAtPosition,
  } = useVisualEditor()

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const [guides, setGuides] = useState<{ type: 'vertical' | 'horizontal'; position: number; start: number; end: number }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'deployed'>('idle')
  
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 })
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, startX: 0, startY: 0, handle: '' })

  const selectedElement = useMemo(() => {
    return selectedId ? getElementById(selectedId) : null
  }, [selectedId, getElementById])

  const hoveredElement = useMemo(() => {
    return hoveredId ? getElementById(hoveredId) : null
  }, [hoveredId, getElementById])

  useEffect(() => {
    setIsAuthenticated(checkAuthCookie())
  }, [])

  const calculateSnapGuides = useCallback((x: number, y: number, w: number, h: number): { type: 'vertical' | 'horizontal'; position: number; start: number; end: number }[] => {
    if (!snapEnabled) return []
    
    const guideList: { type: 'vertical' | 'horizontal'; position: number; start: number; end: number }[] = []
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const centerX = viewportWidth / 2
    const centerY = viewportHeight / 2
    const elementCenterX = x + w / 2
    const elementCenterY = y + h / 2
    
    if (Math.abs(elementCenterX - centerX) < SNAP_THRESHOLD) {
      guideList.push({ type: 'vertical', position: centerX, start: y, end: y + h })
    }
    if (Math.abs(elementCenterY - centerY) < SNAP_THRESHOLD) {
      guideList.push({ type: 'horizontal', position: centerY, start: x, end: x + w })
    }
    if (Math.abs(x) < SNAP_THRESHOLD) {
      guideList.push({ type: 'vertical', position: 0, start: y, end: y + h })
    }
    if (Math.abs(x + w - viewportWidth) < SNAP_THRESHOLD) {
      guideList.push({ type: 'vertical', position: viewportWidth, start: y, end: y + h })
    }
    if (Math.abs(y) < SNAP_THRESHOLD) {
      guideList.push({ type: 'horizontal', position: 0, start: x, end: x + w })
    }
    
    return guideList
  }, [snapEnabled])

  // Handle drag start
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedElement) return
    
    console.log('[Editor] Drag start:', selectedElement.id)
    
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: selectedElement.transform.x,
      startY: selectedElement.transform.y,
    }
    setIsDragging(true)
  }, [selectedElement])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.PointerEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedElement) return
    
    console.log('[Editor] Resize start:', selectedElement.id, handle)
    
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: selectedElement.dimensions.width || (selectedElement.element?.getBoundingClientRect().width || 0),
      height: selectedElement.dimensions.height || (selectedElement.element?.getBoundingClientRect().height || 0),
      startX: selectedElement.transform.x,
      startY: selectedElement.transform.y,
      handle,
    }
    setIsResizing(true)
  }, [selectedElement])

  // Handle pointer down - selection only
  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!isEditing) return
    
    const target = e.target as HTMLElement
    if (isEditorUI(target)) return

    const editable = getEditableAtPosition(e.clientX, e.clientY)
    
    if (editable) {
      e.preventDefault()
      e.stopPropagation()
      console.log('[Editor] Selected:', editable.id)
      setSelectedId(editable.id)
      setOpenPanel(true)
    } else {
      setSelectedId(null)
      setOpenPanel(false)
    }
  }, [isEditing, getEditableAtPosition, setSelectedId, setOpenPanel])

  // Handle pointer move - drag/resize in overlay only, NEVER modify DOM
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!selectedElement) return
    
    if (isDragging) {
      const deltaX = e.clientX - dragStartRef.current.mouseX
      const deltaY = e.clientY - dragStartRef.current.mouseY
      
      let newX = dragStartRef.current.startX + deltaX
      let newY = dragStartRef.current.startY + deltaY
      
      const elementRect = selectedElement.element?.getBoundingClientRect()
      if (!elementRect) return
      
      const visualX = elementRect.left + newX
      const visualY = elementRect.top + newY
      const w = selectedElement.dimensions.width || elementRect.width
      const h = selectedElement.dimensions.height || elementRect.height
      
      const newGuides = calculateSnapGuides(visualX, visualY, w, h)
      setGuides(newGuides)
      
      // Update ONLY the registry state - NEVER touch the DOM
      registerEditable({
        ...selectedElement,
        transform: { x: newX, y: newY },
      })
    }
    
    if (isResizing) {
      const deltaX = e.clientX - resizeStartRef.current.mouseX
      const deltaY = e.clientY - resizeStartRef.current.mouseY
      
      let newWidth = resizeStartRef.current.width
      let newHeight = resizeStartRef.current.height
      let newX = resizeStartRef.current.startX
      let newY = resizeStartRef.current.startY
      const h = resizeStartRef.current.handle
      const aspectRatio = resizeStartRef.current.width / resizeStartRef.current.height
      
      if (h.includes('e')) {
        newWidth = Math.max(MIN_SIZE, resizeStartRef.current.width + deltaX)
      } else if (h.includes('w')) {
        newWidth = Math.max(MIN_SIZE, resizeStartRef.current.width - deltaX)
      }
      
      if (h.includes('s')) {
        newHeight = Math.max(MIN_SIZE, resizeStartRef.current.height + deltaY)
      } else if (h.includes('n')) {
        newHeight = Math.max(MIN_SIZE, resizeStartRef.current.height - deltaY)
      }
      
      if (h.length === 2) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio
        } else {
          newWidth = newHeight * aspectRatio
        }
      }
      
      if (h.includes('w')) {
        const widthDiff = newWidth - resizeStartRef.current.width
        newX = resizeStartRef.current.startX - widthDiff
      }
      if (h.includes('n')) {
        const heightDiff = newHeight - resizeStartRef.current.height
        newY = resizeStartRef.current.startY - heightDiff
      }
      
      // Update ONLY the registry state - NEVER touch the DOM
      registerEditable({
        ...selectedElement,
        transform: { x: newX, y: newY },
        dimensions: { width: newWidth, height: newHeight },
      })
    }
  }, [selectedElement, isDragging, isResizing, calculateSnapGuides, registerEditable])

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setGuides([])
  }, [])

  // Hover detection
  const handleMouseOver = useCallback((e: MouseEvent) => {
    if (!isEditing) return
    
    const target = e.target as HTMLElement
    if (isEditorUI(target)) {
      setHoveredId(null)
      return
    }
    
    const editable = getEditableAtPosition(e.clientX, e.clientY)
    setHoveredId(editable?.id || null)
  }, [isEditing, getEditableAtPosition])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSaveModal) setShowSaveModal(false)
        else if (openPanel) { setOpenPanel(false); setSelectedId(null) }
        else if (isEditing) setIsEditing(false)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        setShowSaveModal(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, showSaveModal, openPanel, setSelectedId, setOpenPanel])

  // Global click interceptor
  const handleGlobalClick = useCallback((e: MouseEvent) => {
    if (!isEditing) return
    
    const target = e.target as HTMLElement
    
    if (
      target.closest('[data-edit-toolbar]') ||
      target.closest('[data-edit-panel]') ||
      target.closest('[data-edit-modal]') ||
      target.closest('.resize-handle')
    ) {
      return
    }
    
    const isLink = target.tagName === 'A' || target.closest('a')
    const isButton = target.tagName === 'BUTTON' || target.closest('button')
    
    if (isLink || isButton) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }, [isEditing])

  // Attach event listeners
  useEffect(() => {
    if (!isEditing) return
    
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('click', handleGlobalClick, true)
    
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'default'
    document.body.setAttribute('data-edit-mode', 'true')
    
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('click', handleGlobalClick, true)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.body.removeAttribute('data-edit-mode')
    }
  }, [isEditing, handlePointerDown, handlePointerMove, handlePointerUp, handleMouseOver, handleGlobalClick])

  const handleSave = async () => {
    setSaveStatus('saving')
    await new Promise(r => setTimeout(r, 1500))
    setSaveStatus('saved')
    setTimeout(() => {
      setShowSaveModal(false)
      setOpenPanel(false)
      setSelectedId(null)
      setSaveStatus('idle')
    }, 1000)
  }

  const handleDeploy = async () => {
    setDeployStatus('deploying')
    try {
      const res = await fetch('/api/deploy', { method: 'POST' })
      if (res.ok) {
        setDeployStatus('deployed')
      } else {
        setDeployStatus('idle')
      }
    } catch {
      setDeployStatus('idle')
    }
    setTimeout(() => setDeployStatus('idle'), 3000)
  }

  const handleClosePanel = useCallback(() => {
    setOpenPanel(false)
    setSelectedId(null)
  }, [setOpenPanel, setSelectedId])

  const getElementValue = (el: EditableElementData) => {
    if (!el.element) return ''
    const type = el.type
    
    if (type === 'text' || type === 'button') {
      return el.element.textContent?.trim() || ''
    }
    if (type === 'image') {
      const img = el.element.querySelector('img') || el.element
      return (img as HTMLImageElement).src || el.element.style.backgroundImage?.match(/url\("?([^"]+)"?\)/)?.[1] || ''
    }
    if (type === 'link') {
      return el.element.getAttribute('href') || ''
    }
    return ''
  }

  return (
    <>
      {/* Snap guides */}
      {isEditing && guides.length > 0 && (
        <div data-ve-overlay className="fixed inset-0 pointer-events-none z-[9991]">
          {guides.map((guide, i) => (
            <div
              key={i}
              className="absolute bg-[#FF8C21]/40"
              style={
                guide.type === 'vertical'
                  ? { left: guide.position - 0.5, top: guide.start, width: 1, height: guide.end - guide.start }
                  : { left: guide.start, top: guide.position - 0.5, height: 1, width: guide.end - guide.start }
              }
            />
          ))}
        </div>
      )}

      {/* Toolbar */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            data-edit-toolbar
            className="fixed top-3 left-3 z-[9999] flex items-center gap-2 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] rounded-full shadow-xl px-3 py-2"
          >
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`p-1.5 rounded-full text-white/80 hover:text-white transition ${snapEnabled ? 'bg-white/30' : 'bg-white/10'}`}
              title={snapEnabled ? 'Snap On' : 'Snap Off'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </button>

            <button
              onClick={() => setShowSaveModal(true)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              title="Save Changes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>

            <button
              onClick={() => { setOpenPanel(false); setSelectedId(null) }}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              title="Deselect"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              onClick={handleDeploy}
              disabled={deployStatus === 'deploying'}
              className={`p-1.5 rounded-full text-white transition ${
                deployStatus === 'deployed' ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30'
              }`}
              title={deployStatus === 'deployed' ? 'Deployed!' : 'Deploy to Live Site'}
            >
              {deployStatus === 'deploying' ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : deployStatus === 'deployed' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </button>

            <button
              onClick={async () => {
                await fetch('/api/editor-auth/logout', { method: 'POST' })
                window.location.href = '/'
              }}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              title="Exit Editor"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover indicator */}
      {isEditing && hoveredElement && hoveredElement.id !== selectedId && (
        <HoverIndicator element={hoveredElement} />
      )}

      {/* Selection overlay */}
      {isEditing && selectedElement && (
        <SelectionOverlay
          element={selectedElement}
          onDragStart={handleDragStart}
          onResizeStart={handleResizeStart}
        />
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
            className={`fixed top-20 z-[9997] w-72 bg-white rounded-2xl shadow-2xl overflow-hidden ${
              (() => {
                const rect = selectedElement.element?.getBoundingClientRect()
                if (!rect) return 'right-4'
                const centerX = rect.left + rect.width / 2
                const screenCenter = window.innerWidth / 2
                return centerX > screenCenter ? 'left-4' : 'right-4'
              })()
            }`}
          >
            <div className="bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedElement.label}</h3>
                  <p className="text-white/70 text-xs capitalize">{selectedElement.type}</p>
                </div>
                <button
                  data-edit-modal
                  onClick={() => { setOpenPanel(false); setSelectedId(null) }}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5">
              {(selectedElement.type === 'text' || selectedElement.type === 'button') && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Text Content</label>
                  <textarea
                    defaultValue={getElementValue(selectedElement)}
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

              {selectedElement.type === 'button' && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700">Button Link (href)</label>
                  <input
                    type="url"
                    defaultValue={selectedElement.element?.getAttribute('href') || ''}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF8C21] focus:border-transparent text-gray-800"
                    onChange={(e) => {
                      if (selectedElement.element) {
                        selectedElement.element.setAttribute('href', e.target.value)
                      }
                    }}
                    placeholder="#contact"
                  />
                </div>
              )}

              {selectedElement.type === 'image' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Image</label>
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl space-y-1">
                    <p><strong>Drag corners</strong> to resize proportionally</p>
                    <p><strong>Drag center</strong> to move</p>
                  </div>
                  <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                    {getElementValue(selectedElement) && (
                      <img src={getElementValue(selectedElement)} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              )}

              {selectedElement.type === 'link' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Link URL</label>
                  <input
                    type="url"
                    defaultValue={getElementValue(selectedElement)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF8C21] focus:border-transparent text-gray-800"
                    onChange={(e) => {
                      if (selectedElement.element) {
                        selectedElement.element.setAttribute('href', e.target.value)
                      }
                    }}
                  />
                </div>
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

      {/* FAB */}
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
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                {saveStatus === 'saved' ? 'Changes saved to editor.' : 'Save changes to editor. Use Deploy button to publish.'}
              </p>

              {saveStatus === 'idle' && (
                <div className="space-y-3">
                  <button
                    data-edit-modal
                    onClick={handleSave}
                    className="w-full py-3 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-xl font-bold"
                  >
                    Save
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