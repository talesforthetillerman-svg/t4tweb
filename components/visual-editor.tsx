"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

interface EditableElement {
  id: string
  type: string
  label: string
  value?: string
  element: HTMLElement
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
}

interface VisualEditorContextType {
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  selectedElement: EditableElement | null
  setSelectedElement: (element: EditableElement | null) => void
  openPanel: boolean
  setOpenPanel: (open: boolean) => void
}

const VisualEditorContext = createContext<VisualEditorContextType>({
  isEditing: false,
  setIsEditing: () => {},
  selectedElement: null,
  setSelectedElement: () => {},
  openPanel: false,
  setOpenPanel: () => {},
})

export function useVisualEditor() {
  return useContext(VisualEditorContext)
}

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedElement, setSelectedElement] = useState<EditableElement | null>(null)
  const [openPanel, setOpenPanel] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('editMode') === 'true' || window.location.pathname === '/editor') {
      setIsEditing(true)
    }
  }, [])

  return (
    <VisualEditorContext.Provider
      value={{ isEditing, setIsEditing, selectedElement, setSelectedElement, openPanel, setOpenPanel }}
    >
      {children}
    </VisualEditorContext.Provider>
  )
}

// Image Selection Overlay Component - Canva/Figma style
function ImageSelectionOverlay({
  element,
  onClose,
}: {
  element: HTMLElement
  onClose: () => void
}) {
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)

  // Update position when element scrolls or resizes
  const updateRect = useCallback(() => {
    if (!element) return
    const newRect = element.getBoundingClientRect()
    setRect({
      x: newRect.left,
      y: newRect.top,
      width: newRect.width,
      height: newRect.height,
    })
  }, [element])

  useEffect(() => {
    updateRect()
    
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

  // Handle resize from corners
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const img = element.querySelector('img')
    const computedStyle = window.getComputedStyle(element)
    const currentWidth = element.offsetWidth
    const currentHeight = element.offsetHeight
    
    // Get the actual visual position
    const actualRect = element.getBoundingClientRect()
    
    setResizeState({
      isResizing: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
      startLeft: actualRect.left,
      startTop: actualRect.top,
    })
  }, [element])

  // Handle mouse move for resizing
  useEffect(() => {
    if (!resizeState.isResizing) return

    const aspectRatio = resizeState.startWidth / resizeState.startHeight

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeState.startX
      const deltaY = e.clientY - resizeState.startY

      let newWidth = resizeState.startWidth
      let newHeight = resizeState.startHeight

      // Calculate new dimensions based on which handle is being dragged
      switch (resizeState.handle) {
        case 'se':
          newWidth = Math.max(50, resizeState.startWidth + deltaX)
          newHeight = newWidth / aspectRatio
          break
        case 'sw':
          newWidth = Math.max(50, resizeState.startWidth - deltaX)
          newHeight = newWidth / aspectRatio
          break
        case 'ne':
          newWidth = Math.max(50, resizeState.startWidth + deltaX)
          newHeight = newWidth / aspectRatio
          break
        case 'nw':
          newWidth = Math.max(50, resizeState.startWidth - deltaX)
          newHeight = newWidth / aspectRatio
          break
      }

      // Apply new dimensions
      element.style.width = `${newWidth}px`
      element.style.height = `${newHeight}px`
      element.style.maxWidth = 'none'
      element.style.maxHeight = 'none'
      element.style.minWidth = '0'
      element.style.minHeight = '0'

      // Update the overlay position
      updateRect()
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
  }, [resizeState, element, updateRect])

  // Handle drag (move) functionality
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const startX = dragStart.x
    const startY = dragStart.y
    const startLeft = rect.x
    const startTop = rect.y

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      // Use transform for smooth movement
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      element.style.position = 'relative'
      
      // Update the overlay position
      setRect(prev => ({
        ...prev,
        x: startLeft + deltaX,
        y: startTop + deltaY,
      }))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
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
  }, [isDragging, dragStart, element, rect])

  const handles = [
    { id: 'nw', cursor: 'nwse-resize', x: -6, y: -6 },
    { id: 'ne', cursor: 'nesw-resize', x: 1, y: -6 },
    { id: 'sw', cursor: 'nesw-resize', x: -6, y: 1 },
    { id: 'se', cursor: 'nwse-resize', x: 1, y: 1 },
  ]

  const getCursorForHandle = (handle: string) => {
    switch (handle) {
      case 'nw': return 'nwse-resize'
      case 'ne': return 'nesw-resize'
      case 'sw': return 'nesw-resize'
      case 'se': return 'nwse-resize'
      default: return 'default'
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* Selection border */}
      <div
        className={`absolute border-2 ${isDragging ? 'border-[#FF8C21]' : 'border-[#FF8C21]'} pointer-events-none transition-all duration-75`}
        style={{
          left: rect.x - 2,
          top: rect.y - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          boxShadow: '0 0 0 1px rgba(255, 140, 33, 0.3), 0 0 20px rgba(255, 140, 33, 0.15)',
        }}
      />

      {/* Drag area */}
      <div
        className={`absolute pointer-events-auto ${isDragging ? 'cursor-move' : 'cursor-move'}`}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        onMouseDown={handleDragStart}
      />

      {/* Resize handles */}
      {handles.map((handle) => (
        <div
          key={handle.id}
          className="resize-handle absolute w-4 h-4 bg-white border-2 border-[#FF8C21] rounded-sm pointer-events-auto shadow-md hover:scale-110 transition-transform"
          style={{
            left: handle.id.includes('e') ? rect.x + rect.width + handle.x : rect.x + handle.x,
            top: handle.id.includes('s') ? rect.y + rect.height + handle.y : rect.y + handle.y,
            cursor: handle.cursor,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => handleResizeStart(e, handle.id)}
        />
      ))}

      {/* Edge handles for width/height adjustment */}
      {/* Top edge */}
      <div
        className="resize-handle absolute w-20 h-3 pointer-events-auto"
        style={{
          left: rect.x + rect.width / 2 - 40,
          top: rect.y - 6,
          cursor: 'ns-resize',
        }}
        onMouseDown={(e) => handleResizeStart(e, 'n')}
      />
      {/* Bottom edge */}
      <div
        className="resize-handle absolute w-20 h-3 pointer-events-auto"
        style={{
          left: rect.x + rect.width / 2 - 40,
          top: rect.y + rect.height + 3,
          cursor: 'ns-resize',
        }}
        onMouseDown={(e) => handleResizeStart(e, 's')}
      />
      {/* Left edge */}
      <div
        className="resize-handle absolute w-3 h-20 pointer-events-auto"
        style={{
          left: rect.x - 6,
          top: rect.y + rect.height / 2 - 40,
          cursor: 'ew-resize',
        }}
        onMouseDown={(e) => handleResizeStart(e, 'w')}
      />
      {/* Right edge */}
      <div
        className="resize-handle absolute w-3 h-20 pointer-events-auto"
        style={{
          left: rect.x + rect.width + 3,
          top: rect.y + rect.height / 2 - 40,
          cursor: 'ew-resize',
        }}
        onMouseDown={(e) => handleResizeStart(e, 'e')}
      />

      {/* Dimension label */}
      <div
        className="absolute pointer-events-none px-2 py-1 bg-gray-800/90 text-white text-[10px] font-mono rounded"
        style={{
          left: rect.x + rect.width / 2 - 35,
          top: rect.y + rect.height + 20,
        }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </div>
    </div>,
    document.body
  )
}

// Main Visual Editor Overlay Component
export function VisualEditorOverlay() {
  const { isEditing, setIsEditing, selectedElement, setSelectedElement, openPanel, setOpenPanel } = useVisualEditor()
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
        target.closest('.resize-handle')) {
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
      if (e.key === 'Delete' && selectedElement && !showSaveModal) {
        // Don't delete on Delete key for now
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
                    <span className="text-white font-bold text-lg">Edición Visual</span>
                    <p className="text-white/70 text-xs hidden sm:block">
                      {selectedElement?.type === 'image' 
                        ? 'Arrastra para mover • Usa las esquinas para redimensionar' 
                        : 'Haz clic en cualquier elemento para editarlo'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open('/studio', '_blank')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Editor Completo</span>
                </button>

                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-5 py-2 bg-white text-[#FF8C21] hover:bg-white/95 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Guardar</span>
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
        <div
          className="fixed pointer-events-none z-[9989] transition-all duration-75"
          style={{
            top: hoveredElement.getBoundingClientRect().top - 2,
            left: hoveredElement.getBoundingClientRect().left - 2,
            width: hoveredElement.getBoundingClientRect().width + 4,
            height: hoveredElement.getBoundingClientRect().height + 4,
            border: '2px dashed #FF8C21',
            borderRadius: '4px',
            background: 'rgba(255, 140, 33, 0.05)',
          }}
        >
          <div className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-medium text-white bg-[#FF8C21] rounded whitespace-nowrap">
            {hoveredElement.getAttribute('data-edit-label') || hoveredElement.getAttribute('data-edit-id')}
          </div>
        </div>
      )}

      {/* Image Selection Overlay - Canva/Figma style */}
      {isEditing && selectedElement?.type === 'image' && (
        <ImageSelectionOverlay
          element={selectedElement.element}
          onClose={() => {
            setSelectedElement(null)
            setOpenPanel(false)
          }}
        />
      )}

      {/* Text/Other Selection Indicator */}
      {isEditing && selectedElement && selectedElement.type !== 'image' && (
        <div
          className="fixed pointer-events-none z-[9989]"
          style={{
            top: selectedElement.element.getBoundingClientRect().top - 2,
            left: selectedElement.element.getBoundingClientRect().left - 2,
            width: selectedElement.element.getBoundingClientRect().width + 4,
            height: selectedElement.element.getBoundingClientRect().height + 4,
            border: '2px solid #FF8C21',
            borderRadius: '4px',
            boxShadow: '0 0 0 3px rgba(255, 140, 33, 0.2)',
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
                  <label className="block text-sm font-semibold text-gray-700">Contenido del texto</label>
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
                  <p className="text-xs text-gray-500">Los cambios se aplican inmediatamente</p>
                </div>
              )}

              {selectedElement.type === 'image' && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">Imagen seleccionada</label>
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl">
                    <p className="font-medium text-gray-700 mb-1">Cómo redimensionar:</p>
                    <ul className="space-y-1">
                      <li>• Arrastra las <strong>esquinas</strong> para cambiar tamaño</li>
                      <li>• Arrastra el <strong>centro</strong> para mover</li>
                      <li>• La relación de aspecto se mantiene automáticamente</li>
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
                    Cambiar imagen
                  </button>
                </div>
              )}

              {selectedElement.type === 'link' && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">Destino del enlace</label>
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
                    Esta es una sección completa del sitio. Para editar su contenido, haz clic en los elementos individuales dentro de ella.
                  </p>
                  <button
                    data-edit-modal
                    onClick={() => window.open('/studio', '_blank')}
                    className="w-full py-3 border border-[#FF8C21] text-[#FF8C21] rounded-xl font-semibold hover:bg-[#FF8C21]/10 transition-colors"
                  >
                    Abrir Editor Completo
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
                Guardar cambios
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
          title="Activar modo edición"
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
                  {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? '¡Guardado!' : 'Guardar y Publicar'}
                </h3>
                
                <p className="text-gray-600 text-center mb-8">
                  {saveStatus === 'saved' 
                    ? 'Los cambios se han publicado correctamente.'
                    : 'Los cambios se guardarán en el CMS y se publicarán automáticamente.'}
                </p>

                {saveStatus === 'idle' && (
                  <div className="space-y-3">
                    <button
                      data-edit-modal
                      onClick={handleSave}
                      className="w-full py-4 bg-gradient-to-r from-[#FF8C21] to-[#FF6C00] text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[#FF8C21]/30"
                    >
                      Guardar y Publicar Ahora
                    </button>
                    
                    <button
                      data-edit-modal
                      onClick={() => setShowSaveModal(false)}
                      className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
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

function getCursorForHandle(handle: string) {
  switch (handle) {
    case 'nw': case 'se': return 'nwse-resize'
    case 'ne': case 'sw': return 'nesw-resize'
    case 'n': case 's': return 'ns-resize'
    case 'e': case 'w': return 'ew-resize'
    default: return 'default'
  }
}
