import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export default function Toggle({ checked, onChange, label, description, id, disabled = false }) {
  const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex-1">
          {label && <p className="text-sm font-medium text-neutral-800">{label}</p>}
          {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
        </div>
      )}
      <button
        id={toggleId}
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle'}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          checked ? 'bg-primary-500' : 'bg-neutral-200',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="pointer-events-none inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow ring-0"
        />
      </button>
    </div>
  )
}
