import Button from './Button'
import { motion } from 'framer-motion'

export default function EmptyState({ icon, title, description, action, actionLabel, secondaryAction, secondaryLabel, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center py-16 px-8 ${className || ''}`}
    >
      {icon && (
        <div className="w-16 h-16 mb-4 text-neutral-300 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-neutral-700 mb-2">{title}</h3>
      {description && <p className="text-sm text-neutral-500 max-w-sm mb-6">{description}</p>}
      {action && (
        <div className="flex items-center gap-3">
          <Button onClick={action}>{actionLabel}</Button>
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction}>{secondaryLabel}</Button>
          )}
        </div>
      )}
    </motion.div>
  )
}
