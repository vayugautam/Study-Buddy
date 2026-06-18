import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth, useUI } from '../store'
import Avatar from '../components/ui/Avatar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Toggle from '../components/ui/Toggle'

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const { theme, setTheme, addToast } = useUI()
  
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile({ name, bio })
      addToast('Profile updated successfully', 'success')
      setIsEditing(false)
    } catch {
      addToast('Failed to update profile', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="text-h2 text-neutral-900">Profile & Settings</h1>

      {/* User Info */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="relative group">
          <Avatar user={user} size="2xl" />
          <button className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
        
        <div className="flex-1 space-y-4 w-full">
          {isEditing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              <div className="flex gap-3">
                <Button onClick={handleSave} isLoading={isSaving}>Save Changes</Button>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </motion.div>
          ) : (
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">{user?.name}</h2>
                <p className="text-neutral-500">{user?.email}</p>
                <p className="mt-2 text-sm text-neutral-600">{user?.bio || 'No bio provided.'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 px-1">Preferences</h3>
        <Card className="divide-y divide-neutral-100" padding="none">
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900">Theme</p>
              <p className="text-sm text-neutral-500">Choose your interface style</p>
            </div>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          
          <div className="p-6">
            <Toggle 
              checked={user?.preferences?.notifications?.studyReminders ?? true}
              onChange={() => {}}
              label="Study Reminders"
              description="Get notified when you haven't studied in a few days"
            />
          </div>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 mt-12 pt-8 border-t border-neutral-200">
        <h3 className="text-lg font-semibold text-error px-1">Danger Zone</h3>
        <Card className="border-error/20 bg-red-50/30 flex items-center justify-between">
          <div>
            <p className="font-medium text-neutral-900">Sign Out</p>
            <p className="text-sm text-neutral-500">Log out of this device</p>
          </div>
          <Button variant="danger-outline" onClick={logout}>Sign out</Button>
        </Card>
      </div>
    </div>
  )
}
