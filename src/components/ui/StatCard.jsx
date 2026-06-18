import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { Skeleton } from './Skeleton'

const colorMap = {
  primary: { bg: 'bg-primary-100', text: 'text-primary-600', trend: 'text-primary-500' },
  success: { bg: 'bg-green-100', text: 'text-success', trend: 'text-success' },
  warning: { bg: 'bg-yellow-100', text: 'text-warning', trend: 'text-yellow-600' },
  error: { bg: 'bg-red-100', text: 'text-error', trend: 'text-error' },
  info: { bg: 'bg-blue-100', text: 'text-info', trend: 'text-info' },
  accent: { bg: 'bg-teal-100', text: 'text-accent-600', trend: 'text-accent-500' },
}

export default function StatCard({ label, value, icon, trend, accentColor = 'primary', isLoading = false, onClick }) {
  const colors = colorMap[accentColor] || colorMap.primary

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
    )
  }

  const CardWrapper = onClick ? motion.div : 'div'
  const motionProps = onClick ? {
    whileHover: { y: -2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    whileTap: { scale: 0.99 },
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  } : {}

  return (
    <CardWrapper
      className={cn('bg-white rounded-2xl border border-neutral-200 p-6 shadow-card', onClick && 'cursor-pointer')}
      onClick={onClick}
      {...motionProps}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', colors.bg)}>
          <span className={cn('text-xl', colors.text)}>{icon}</span>
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.direction === 'up' ? 'bg-green-50 text-success' :
            trend.direction === 'down' ? 'bg-red-50 text-error' :
            'bg-neutral-100 text-neutral-500'
          )}>
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-neutral-900 mb-1">{value}</div>
      <div className="text-sm text-neutral-500">{label}</div>
      {trend?.label && (
        <div className="text-xs text-neutral-400 mt-1">{trend.label}</div>
      )}
    </CardWrapper>
  )
}
