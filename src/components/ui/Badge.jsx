import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-neutral-100 text-neutral-600',
  accent: 'bg-teal-100 text-teal-700',
}

const sizes = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function Badge({ children, variant = 'primary', size = 'md', className, dot = false }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-medium rounded-full',
      variants[variant],
      sizes[size],
      className,
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full bg-current opacity-70')} />}
      {children}
    </span>
  )
}
