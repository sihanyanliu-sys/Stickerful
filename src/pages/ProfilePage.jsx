import { useState, useRef } from 'react'
import { useSettings } from '../context/SettingsContext'
import AvatarCropModal from '../components/AvatarCropModal'

const AVATAR_OPTIONS = ['🙂','😊','😎','🥸','🤩','😄','🤗','🙃','😏','🤔','🧑','👩','👨','🧙','🦸','🧜']

// Returns true if the avatar value is a photo (data URL), false if it's an emoji string
function isPhotoAvatar(v) {
  return typeof v === 'string' && v.startsWith('data:')
}

export default function ProfilePage({ navigate }) {
  const { settings, updateSetting } = useSettings()
  const [name, setName] = useState(settings.userName)
  const [avatar, setAvatar] = useState(settings.userAvatar)
  const [showPicker, setShowPicker] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)   // raw photo data URL waiting to be cropped
  const fileRef = useRef(null)

  function handleSave() {
    updateSetting('userName', name)
    updateSetting('userAvatar', avatar)
    navigate(-1)
  }

  function handlePickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''  // reset so picking the same file again still fires
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result)
    reader.readAsDataURL(file)
  }

  function handleCropDone(dataUrl) {
    setAvatar(dataUrl)
    setCropSrc(null)
    setShowPicker(false)
  }

  return (
    <div className="app-page-bg flex flex-col h-full">
      {/* Nav */}
      <div className="flex items-center px-5 pt-14 pb-4 border-b t-border" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[#FF9500] font-medium text-[16px] active:opacity-60 mr-4">
          ‹ 返回
        </button>
        <h2 className="flex-1 text-center font-semibold text-[17px] t-text-1" style={{ color: 'var(--text-1)' }}>个人信息</h2>
        <button onClick={handleSave} className="text-[#FF9500] font-semibold text-[16px] active:opacity-60">
          保存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <div className="w-24 h-24 rounded-full bg-[#FFF0DB] flex items-center justify-center text-5xl mb-3 overflow-hidden">
            {isPhotoAvatar(avatar)
              ? <img src={avatar} alt="头像" className="w-full h-full object-cover" />
              : avatar}
          </div>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="text-[#FF9500] font-medium text-[15px] active:opacity-60"
          >
            更换头像
          </button>

          {/* Picker */}
          {showPicker && (
            <div
              className="mt-4 p-3 rounded-[16px] border t-border w-full max-w-[360px]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            >
              {/* Upload photo button */}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-[12px] font-medium text-[14px] active:opacity-70"
                style={{ background: '#FF950020', color: '#FF9500' }}
              >
                <span className="text-[16px]">📷</span>
                <span>从相册上传照片</span>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePickFile}
              />

              {/* Divider */}
              <p className="text-[11px] mb-2 px-1" style={{ color: 'var(--text-2)' }}>或选择 emoji</p>

              {/* Emoji grid */}
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => { setAvatar(e); setShowPicker(false) }}
                    className={`w-9 h-9 text-2xl flex items-center justify-center rounded-[10px] active:scale-90 transition-transform ${
                      avatar === e ? 'bg-[#FF9500]/20 ring-2 ring-[#FF9500]' : ''
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] t-text-2 mb-1.5" style={{ color: 'var(--text-2)' }}>昵称</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-[12px] px-4 py-3 t-text-1 border t-border outline-none"
              style={{ background: 'var(--bg)', color: 'var(--text-1)', borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <p className="text-[13px] t-text-2 mb-1.5" style={{ color: 'var(--text-2)' }}>加入时间</p>
            <p className="rounded-[12px] px-4 py-3" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
              {settings.joinDate || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Crop modal */}
      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onConfirm={handleCropDone}
        />
      )}
    </div>
  )
}
