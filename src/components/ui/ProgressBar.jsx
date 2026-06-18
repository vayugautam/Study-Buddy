import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

const colorMap = {
  primary: 'bg-primary-500',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  accent: 'bg-accent-500',
}

const heightMap = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
  xl: 'h-3',
}

export default function ProgressBar({
  value = 0,
  max = 100,
  color = 'primary',
  height = 'md',
  showLabel = false,
  animated = true,
  className,
  label,
  'aria-label': ariaLabel,
}) {
  const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-neutral-500">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-neutral-700">{percent}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel || label || `Progress: ${percent}% complete`}
        className={cn('w-full bg-neutral-200 rounded-full overflow-hidden', heightMap[height])}
      >
        <motion.div
          className={cn('h-full rounded-full', colorMap[color])}
          initial={{ width: 0 }}
          animate={animated ? { width: `${percent}%` } : { width: `${percent}%` }}
          transition={animated ? { type: 'spring', stiffness: 60, damping: 14 } : { duration: 0 }}
        />
      </div>
    </div>
  )
}
