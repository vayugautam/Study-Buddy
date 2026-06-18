import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white border-transparent shadow-sm hover:shadow-md',
  secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200',
  ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700 border-transparent',
  danger: 'bg-error hover:bg-red-600 text-white border-transparent',
  'danger-outline': 'bg-transparent hover:bg-red-50 text-error border-error',
  outline: 'bg-transparent hover:bg-primary-50 text-primary-600 border-primary-300',
  success: 'bg-success hover:bg-green-600 text-white border-transparent',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
  xl: 'px-8 py-4 text-lg rounded-2xl gap-3',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  ...props
}) {
  const isDisabled = disabled || isLoading

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.97 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'inline-flex items-center justify-center font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin-slow w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  )
}
