import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth, useUI } from '../store'
import Avatar from '../components/ui/Avatar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Toggle from '../components/ui/Toggle'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { theme, setTheme, addToast } = useUI()

  const [name, setName] = useState(user?.name || 'Guest Student')
  const [bio, setBio] = useState(user?.bio || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile({ name, bio })
      addToast('Profile updated for this session', 'success')
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
      <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <Avatar user={user} size="2xl" />
        <div className="flex-1 space-y-4 w-full">
          {isEditing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} />
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
                <p className="text-neutral-500">Guest session — no account required</p>
                <p className="mt-2 text-sm text-neutral-600">{user?.bio || 'No bio provided.'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900 px-1">Preferences</h3>
        <Card className="divide-y divide-neutral-100" padding="none">
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900">Theme</p>
              <p className="text-sm text-neutral-500">Choose your interface style</p>
            </div>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm rounded-lg p-2.5">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="p-6">
            <Toggle checked={user?.preferences?.notifications?.studyReminders ?? true} onChange={() => {}} label="Study Reminders" description="Get notified when you haven't studied in a few days" />
          </div>
        </Card>
      </div>
    </div>
  )
}
