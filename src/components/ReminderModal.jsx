import { useState } from 'react'

export default function ReminderModal({ onClose }) {
  const [enabled, setEnabled] = useState(true)
  const [time, setTime] = useState('20:00')

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl px-4 pt-5 pb-10 z-10">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">每日提醒</h3>
        <p className="text-sm text-gray-400 mb-6">记得记录今天的咖啡足迹</p>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-4">
            <span className="text-gray-800 font-medium">开启提醒</span>
            <button
              onClick={() => setEnabled(e => !e)}
              className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-orange-400' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {enabled && (
            <div className="bg-gray-50 rounded-2xl px-4 py-4">
              <p className="text-sm text-gray-500 mb-2">提醒时间</p>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="text-2xl font-bold text-gray-900 bg-transparent outline-none"
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-4 bg-orange-400 text-white font-semibold rounded-2xl active:scale-95 transition-transform"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
