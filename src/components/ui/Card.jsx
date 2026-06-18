import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export default function Card({ children, className, hoverable = false, onClick, padding = 'md', ...props }) {
  const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

  const Component = onClick || hoverable ? motion.div : 'div'
  const motionProps = (onClick || hoverable) ? {
    whileHover: { y: -2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    whileTap: onClick ? { scale: 0.99 } : {},
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  } : {}

  return (
    <Component
      className={cn(
        'bg-white rounded-2xl border border-neutral-200 shadow-card',
        hoverable && 'cursor-pointer',
        paddings[padding],
        className,
      )}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  )
}
