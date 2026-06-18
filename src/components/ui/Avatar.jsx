import { cn } from '../../lib/utils'
import { getInitials } from '../../lib/utils'

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
}

export default function Avatar({ user, size = 'md', className, onClick }) {
  const initials = getInitials(user?.name || 'User')

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        onClick={onClick}
        className={cn(
          'rounded-full object-cover ring-2 ring-white',
          sizes[size],
          onClick && 'cursor-pointer hover:ring-primary-300 transition-all',
          className,
        )}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-full flex items-center justify-center font-semibold ring-2 ring-white',
        'bg-gradient-to-br from-primary-400 to-primary-600 text-white',
        sizes[size],
        onClick && 'cursor-pointer hover:ring-primary-300 transition-all',
        className,
      )}
      aria-label={user?.name || 'User avatar'}
    >
      {initials}
    </div>
  )
}
