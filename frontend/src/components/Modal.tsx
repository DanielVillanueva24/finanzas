import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-navy/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          'relative z-10 flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-card ' +
          (size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg')
        }
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>
        <div className="safe-bottom flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="safe-bottom flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
