import { useState } from 'react'
import { X, Key, Eye, EyeOff, ExternalLink, Check } from 'lucide-react'
import { useAppStore } from '../store/appStore.js'

export default function SettingsModal() {
  const { settings, updateSettings, closeSettings } = useAppStore()
  const [form, setForm] = useState({
    finnhubKey: settings.finnhubKey || '',
    newsApiKey: settings.newsApiKey || '',
    anthropicKey: settings.anthropicKey || '',
    riskProfile: settings.riskProfile || 'moderate',
    emailNotifications: settings.emailNotifications || false,
    email: settings.email || '',
  })
  const [show, setShow] = useState({})
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      closeSettings()
    }, 1000)
  }

  const toggle = (key) => setShow(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeSettings} />
      <div className="relative bg-bg-card border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-white">Einstellungen</h2>
          <button onClick={closeSettings} className="btn-ghost p-1.5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* API Keys */}
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">API-Schlüssel</h3>
            <div className="space-y-3">
              <ApiKeyField
                label="Finnhub API Key"
                placeholder="Für Echtzeit-Kurse (kostenlos)"
                link="https://finnhub.io/register"
                value={form.finnhubKey}
                show={show.finnhub}
                onChange={v => setForm(f => ({ ...f, finnhubKey: v }))}
                onToggle={() => toggle('finnhub')}
              />
              <ApiKeyField
                label="GNews API Key"
                placeholder="Für Live-Nachrichten (kostenlos)"
                link="https://gnews.io/"
                value={form.newsApiKey}
                show={show.news}
                onChange={v => setForm(f => ({ ...f, newsApiKey: v }))}
                onToggle={() => toggle('news')}
              />
              <ApiKeyField
                label="Anthropic API Key"
                placeholder="Für KI-Analysen (Claude)"
                link="https://console.anthropic.com/"
                value={form.anthropicKey}
                show={show.anthropic}
                onChange={v => setForm(f => ({ ...f, anthropicKey: v }))}
                onToggle={() => toggle('anthropic')}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Ohne API-Keys laufen alle Funktionen mit realistischen Demo-Daten.
            </p>
          </section>

          {/* Risk Profile */}
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Risikoprofil</h3>
            <div className="grid grid-cols-3 gap-2">
              {['conservative', 'moderate', 'aggressive'].map(profile => (
                <button
                  key={profile}
                  onClick={() => setForm(f => ({ ...f, riskProfile: profile }))}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    form.riskProfile === profile
                      ? 'bg-accent-blue border-accent-blue text-white'
                      : 'border-border text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {profile === 'conservative' ? 'Konservativ' : profile === 'moderate' ? 'Moderat' : 'Aggressiv'}
                </button>
              ))}
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Benachrichtigungen</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, emailNotifications: !f.emailNotifications }))}
                className={`w-10 h-5 rounded-full transition-colors ${form.emailNotifications ? 'bg-accent-blue' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form.emailNotifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-gray-300">Morgen-Report per E-Mail</span>
            </label>
            {form.emailNotifications && (
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="deine@email.de"
                className="input-dark w-full mt-2"
              />
            )}
          </section>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={closeSettings} className="btn-ghost">Abbrechen</button>
          <button
            onClick={handleSave}
            className={`btn-primary flex items-center gap-2 ${saved ? 'bg-bull hover:bg-bull' : ''}`}
          >
            {saved ? <><Check size={16} /> Gespeichert</> : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApiKeyField({ label, placeholder, link, value, show, onChange, onToggle }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-400">{label}</label>
        <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent-blue hover:underline">
          Kostenlos registrieren <ExternalLink size={10} />
        </a>
      </div>
      <div className="relative">
        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-dark w-full pl-8 pr-10"
        />
        <button onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}
