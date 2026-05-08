'use client'

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

type User = {
  email: string
  role: string
  name: string
}

type Event = {
  id: string
  title: string
  type: string
  start_date: string
  end_date: string
  expected_sales: number
  sales: number
  memo: string
  created_by: string
  color: string
}

const EVENT_TYPES = ['프로모션', '박람회', '세미나', '신제품', '제휴', '기타']

const COLOR_OPTIONS = [
  { label: '파랑', value: '#3b82f6' },
  { label: '초록', value: '#22c55e' },
  { label: '빨강', value: '#ef4444' },
  { label: '보라', value: '#a855f7' },
  { label: '주황', value: '#f97316' },
  { label: '분홍', value: '#ec4899' },
  { label: '하늘', value: '#06b6d4' },
  { label: '노랑', value: '#eab308' },
]

export default function Home() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [filterType, setFilterType] = useState('')
  const [form, setForm] = useState({
    title: '', type: '프로모션', start_date: '', end_date: '',
    expected_sales: '', sales: '', memo: '', color: '#3b82f6'
  })

  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved) {
      const u = JSON.parse(saved)
      setUser(u)
      fetchEvents()
    }
  }, [])

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('start_date')
    if (data) setEvents(data)
  }

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const { data: allowedUser, error } = await supabase
      .from('allowed_users').select('*').eq('email', email).eq('is_active', true).single()
    if (error || !allowedUser) {
      setMessage('승인되지 않은 이메일입니다.')
      setLoading(false)
      return
    }
    const userData = { email, role: allowedUser.role, name: allowedUser.name }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    fetchEvents()
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.start_date || !form.end_date) return
    const payload = {
      title: form.title, type: form.type,
      start_date: form.start_date, end_date: form.end_date,
      expected_sales: Number(form.expected_sales) || 0,
      sales: Number(form.sales) || 0,
      memo: form.memo, created_by: user?.email,
      color: form.color
    }
    if (editingEvent) {
      await supabase.from('events').update(payload).eq('id', editingEvent.id)
    } else {
      await supabase.from('events').insert(payload)
    }
    resetForm()
    fetchEvents()
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setForm({
      title: event.title, type: event.type,
      start_date: event.start_date, end_date: event.end_date,
      expected_sales: String(event.expected_sales),
      sales: String(event.sales), memo: event.memo || '',
      color: event.color || '#3b82f6'
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }

  const resetForm = () => {
    setForm({ title: '', type: '프로모션', start_date: '', end_date: '', expected_sales: '', sales: '', memo: '', color: '#3b82f6' })
    setEditingEvent(null)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.start_date <= dateStr && e.end_date >= dateStr)
  }

  const monthEvents = events.filter(e => {
    const d = new Date(e.start_date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const totalExpected = monthEvents.reduce((s, e) => s + e.expected_sales, 0)
  const totalSales = monthEvents.reduce((s, e) => s + e.sales, 0)
  const achieveRate = totalExpected > 0 ? Math.round((totalSales / totalExpected) * 100) : 0

  const filteredEvents = events.filter(e => {
    if (filterStart && e.end_date < filterStart) return false
    if (filterEnd && e.start_date > filterEnd) return false
    if (filterType && e.type !== filterType) return false
    return true
  })

  const fmt = (n: number) => n.toLocaleString()

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2 text-center">행사 매출 관리</h1>
          <p className="text-gray-500 text-sm text-center mb-6">승인된 이메일로만 접속 가능합니다</p>
          <input type="email" placeholder="이메일 입력" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full border rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={handleLogin} disabled={loading || !email}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? '확인 중...' : '로그인'}
          </button>
          {message && <p className="mt-4 text-sm text-center text-red-500">{message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">📊 행사 매출 관리 대시보드</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.name} ({user.role})</span>
          <button onClick={handleLogout} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">로그아웃</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">

        {/* KPI 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">이번 달 행사 수</p>
            <p className="text-2xl font-bold text-blue-600">{monthEvents.length}건</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">이번 달 목표 매출</p>
            <p className="text-2xl font-bold text-orange-500">{fmt(totalExpected)}원</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">이번 달 실제 매출</p>
            <p className="text-2xl font-bold text-green-600">{fmt(totalSales)}원</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">목표 대비 달성률</p>
            <p className="text-2xl font-bold text-purple-600">{achieveRate}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(achieveRate, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* 달력 + 폼 */}
        <div className="flex gap-6 mb-6 items-start">
          <div className="bg-white rounded-lg shadow p-4 flex-1 min-w-0 self-start">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="px-3 py-1 hover:bg-gray-100 rounded">◀</button>
              <h2 className="text-lg font-bold">{year}년 {month + 1}월</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="px-3 py-1 hover:bg-gray-100 rounded">▶</button>
            </div>
            <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => (
                <div key={i} className="min-h-16 border rounded p-1">
                  {day && (
                    <>
                      <p className="text-xs text-gray-600 mb-1">{day}</p>
                      {getEventsForDay(day).map(e => (
                        <div key={e.id} onClick={() => handleEdit(e)}
                          className="text-white text-xs rounded px-1 mb-0.5 truncate cursor-pointer"
                          style={{ backgroundColor: e.color || '#3b82f6' }}>
                          {e.title}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 우측 폼 */}
          {(user.role === 'editor' || user.role === 'admin') && (
            <div className="bg-white rounded-lg shadow p-4 w-72 flex-shrink-0 sticky top-6 self-start">
              <h3 className="font-bold text-lg mb-4">
                {editingEvent ? '✏️ 행사 수정' : '➕ 행사 등록'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">행사명</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded px-3 py-1.5 mt-1 text-sm" placeholder="행사명 입력" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">행사 유형</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border rounded px-3 py-1.5 mt-1 text-sm">
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">시작일</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full border rounded px-2 py-1.5 mt-1 text-xs" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">종료일</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full border rounded px-2 py-1.5 mt-1 text-xs" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">목표 매출</label>
                    <input type="number" value={form.expected_sales} onChange={e => setForm({ ...form, expected_sales: e.target.value })}
                      className="w-full border rounded px-2 py-1.5 mt-1 text-sm" placeholder="0" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">실제 매출</label>
                    <input type="number" value={form.sales} onChange={e => setForm({ ...form, sales: e.target.value })}
                      className="w-full border rounded px-2 py-1.5 mt-1 text-sm" placeholder="0" />
                  </div>
                </div>

                {/* 색상 선택 */}
                <div>
                  <label className="text-xs text-gray-500">색상</label>
                  <div className="grid grid-cols-8 gap-1 mt-2">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.value} onClick={() => setForm({ ...form, color: c.value })}
                        title={c.label}
                        className="w-5 h-5 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: c.value,
                          borderColor: form.color === c.value ? '#1f2937' : 'transparent',
                          transform: form.color === c.value ? 'scale(1.2)' : 'scale(1)'
                        }} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">메모</label>
                  <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })}
                    className="w-full border rounded px-3 py-1.5 mt-1 text-sm" rows={2} placeholder="메모 입력" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSubmit}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium">
                    {editingEvent ? '수정 완료' : '등록'}
                  </button>
                  <button onClick={resetForm}
                    className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-sm">
                    초기화
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 기간별 조회 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-3">📋 기간별 조회</h3>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
              className="border rounded px-3 py-2 text-sm" />
            <span className="text-gray-500">~</span>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
              className="border rounded px-3 py-2 text-sm" />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border rounded px-3 py-2 text-sm">
              <option value="">전체 유형</option>
              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterType('') }}
              className="px-3 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">초기화</button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">행사 수</p>
              <p className="text-2xl font-bold text-blue-600">{filteredEvents.length}건</p>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">목표 매출 합계</p>
              <p className="text-2xl font-bold text-orange-500">{fmt(filteredEvents.reduce((s, e) => s + e.expected_sales, 0))}원</p>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">실제 매출 합계</p>
              <p className="text-2xl font-bold text-green-600">{fmt(filteredEvents.reduce((s, e) => s + e.sales, 0))}원</p>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">달성률</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredEvents.reduce((s, e) => s + e.expected_sales, 0) > 0
                  ? Math.round((filteredEvents.reduce((s, e) => s + e.sales, 0) / filteredEvents.reduce((s, e) => s + e.expected_sales, 0)) * 100)
                  : 0}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(filteredEvents.reduce((s, e) => s + e.expected_sales, 0) > 0 ? Math.round((filteredEvents.reduce((s, e) => s + e.sales, 0) / filteredEvents.reduce((s, e) => s + e.expected_sales, 0)) * 100) : 0, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-left">
                  <th className="px-3 py-2">색상</th>
                  <th className="px-3 py-2">행사명</th>
                  <th className="px-3 py-2">유형</th>
                  <th className="px-3 py-2">기간</th>
                  <th className="px-3 py-2 text-right">목표 매출</th>
                  <th className="px-3 py-2 text-right">실제 매출</th>
                  <th className="px-3 py-2">메모</th>
                  <th className="px-3 py-2">등록자</th>
                  <th className="px-3 py-2 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <tr key={event.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: event.color || '#3b82f6' }} />
                    </td>
                    <td className="px-3 py-2 font-medium">{event.title}</td>
                    <td className="px-3 py-2">
                      <span className="text-white text-xs px-2 py-0.5 rounded" style={{ backgroundColor: event.color || '#3b82f6' }}>{event.type}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{event.start_date} ~ {event.end_date}</td>
                    <td className="px-3 py-2 text-right">{fmt(event.expected_sales)}원</td>
                    <td className="px-3 py-2 text-right">{fmt(event.sales)}원</td>
                    <td className="px-3 py-2 text-gray-400 max-w-32 truncate">{event.memo}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{event.created_by}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-center">
                        {(user.role === 'editor' || user.role === 'admin') && (
                          <button onClick={() => handleEdit(event)} className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-xs">수정</button>
                        )}
                        {user.role === 'admin' && (
                          <button onClick={() => handleDelete(event.id)} className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-xs text-red-600">삭제</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-gray-400 py-8">행사가 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}