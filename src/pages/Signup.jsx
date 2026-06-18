import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../store'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { signup, isLoading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await signup(name, email, password)
      navigate('/dashboard')
    } catch {
      // Error is handled in store
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white p-8 rounded-3xl shadow-float border border-neutral-100"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">Create an account</h2>
        <p className="text-neutral-500">Start studying smarter today.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-error text-sm">
            {error}
          </div>
        )}

        <Input
          label="Full name"
          type="text"
          required
          placeholder="Jane Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="Email address"
          type="email"
          required
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Password"
          type="password"
          required
          placeholder="••••••••"
          hint="Must be at least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          disabled={!email || !password || !name}
          className="mt-6"
        >
          Create account
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </div>
    </motion.div>
  )
}
