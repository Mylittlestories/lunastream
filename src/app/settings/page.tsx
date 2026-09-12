'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, Moon, Sun, Globe, Volume2, 
  Monitor, Smartphone, Save, ArrowLeft 
} from 'lucide-react';
import Link from 'next/link';

interface UserSettings {
  theme: 'dark' | 'light';
  language: string;
  defaultQuality: string;
  autoplay: boolean;
  subtitlesEnabled: boolean;
  subtitleLanguage: string;
  opensubtitlesApiKey: string;
  notifications: boolean;
  analytics: boolean;
}

export default function SettingsPage() {
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    fetch('/version.json')
      .then(r => r.json())
      .then(d => setAppVersion(d?.version || ''))
      .catch(() => {});
  }, []);

  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    language: 'en',
    defaultQuality: 'auto',
    autoplay: true,
    subtitlesEnabled: false,
    subtitleLanguage: 'en',
    opensubtitlesApiKey: '',
    notifications: true,
    analytics: false
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('lunastream_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('lunastream_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#0b0b1a] p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="text-purple-400" />
            Settings
          </h1>
        </div>

        <div className="space-y-8">
          {/* Appearance */}
          <section className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Moon className="text-purple-400" />
              Appearance
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Theme</p>
                  <p className="text-sm text-gray-400">Choose your preferred theme</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleChange('theme', 'dark')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      settings.theme === 'dark'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#0b0b1a] text-gray-400 hover:bg-[#1a1a3e]'
                    }`}
                  >
                    <Moon size={18} />
                    Dark
                  </button>
                  <button
                    onClick={() => handleChange('theme', 'light')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      settings.theme === 'light'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#0b0b1a] text-gray-400 hover:bg-[#1a1a3e]'
                    }`}
                  >
                    <Sun size={18} />
                    Light
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Language */}
          <section className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Globe className="text-purple-400" />
              Language
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Interface Language</p>
                  <p className="text-sm text-gray-400">Set your preferred language</p>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="px-4 py-2 bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg text-white"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="el">Greek</option>
                </select>
              </div>

              <div>
                <p className="text-white font-medium">OpenSubtitles API Key</p>
                <p className="text-sm text-gray-400 mb-2">
                  Enables online subtitle search in the player. Create a free account at
                  opensubtitles.com, then copy the API key from your profile page.
                </p>
                <input
                  type="text"
                  value={settings.opensubtitlesApiKey || ''}
                  onChange={(e) => handleChange('opensubtitlesApiKey', e.target.value.trim())}
                  placeholder="Paste your OpenSubtitles API key (optional)"
                  className="w-full px-4 py-2 bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg text-white text-sm font-mono"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Stored only on this device. You can always load .srt/.vtt files directly in the player without a key.
                </p>
              </div>
            </div>
          </section>

          {/* Playback */}
          <section className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Volume2 className="text-purple-400" />
              Playback
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Default Quality</p>
                  <p className="text-sm text-gray-400">Select default video quality</p>
                </div>
                <select
                  value={settings.defaultQuality}
                  onChange={(e) => handleChange('defaultQuality', e.target.value)}
                  className="px-4 py-2 bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg text-white"
                >
                  <option value="auto">Auto</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Autoplay</p>
                  <p className="text-sm text-gray-400">Automatically play next episode</p>
                </div>
                <button
                  onClick={() => handleChange('autoplay', !settings.autoplay)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.autoplay ? 'bg-purple-600' : 'bg-[#0b0b1a]'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.autoplay ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Subtitles */}
          <section className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Monitor className="text-purple-400" />
              Subtitles
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Enable Subtitles</p>
                  <p className="text-sm text-gray-400">Show subtitles by default</p>
                </div>
                <button
                  onClick={() => handleChange('subtitlesEnabled', !settings.subtitlesEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.subtitlesEnabled ? 'bg-purple-600' : 'bg-[#0b0b1a]'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.subtitlesEnabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Subtitle Language</p>
                  <p className="text-sm text-gray-400">Default subtitle language</p>
                </div>
                <select
                  value={settings.subtitleLanguage}
                  onChange={(e) => handleChange('subtitleLanguage', e.target.value)}
                  className="px-4 py-2 bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg text-white"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Smartphone className="text-purple-400" />
              Privacy
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notifications</p>
                  <p className="text-sm text-gray-400">Enable push notifications</p>
                </div>
                <button
                  onClick={() => handleChange('notifications', !settings.notifications)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.notifications ? 'bg-purple-600' : 'bg-[#0b0b1a]'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Analytics</p>
                  <p className="text-sm text-gray-400">Help improve LunaStream with usage data</p>
                </div>
                <button
                  onClick={() => handleChange('analytics', !settings.analytics)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.analytics ? 'bg-purple-600' : 'bg-[#0b0b1a]'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.analytics ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Save size={20} />
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600 mt-10">
        LunaStream {appVersion ? `v${appVersion}` : ''}
      </p>
    </div>
  );
}
