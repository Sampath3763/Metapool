import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function App() {
  const [queue, setQueue] = useState([])
  const [name, setName] = useState('')
  const [studentIdInput, setStudentIdInput] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || null)
  const [lastAddedId, setLastAddedId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const mounted = useRef(false)

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 3000)
    mounted.current = true
    return () => { mounted.current = false; clearInterval(t) }
  }, [])

  async function fetchQueue() {
    try {
      const res = await axios.get(`${API}/api/queue`)
      setQueue(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  async function join() {
    if (!name) return
    try {
      const payload = { name }
      if (studentIdInput) payload.studentId = studentIdInput
      const res = await axios.post(`${API}/api/join`, payload)
      setName('')
      setStudentIdInput('')
      setLastAddedId(res.data._id)
      // clear the highlight after animation
      setTimeout(() => setLastAddedId(null), 900)
      fetchQueue()
    } catch (e) { console.error(e) }
  }

  async function adminLogin() {
    if (!adminPassword) return
    // Simple admin flow: store the raw password locally and send it as Bearer token on protected calls
    setAdminToken(adminPassword)
    localStorage.setItem('adminToken', adminPassword)
    setAdminPassword('')
  }

  function adminLogout() {
    setAdminToken(null)
    localStorage.removeItem('adminToken')
  }

  // animate removal: set removing state, wait for animation end then call API
  async function complete(id) {
    if (!adminToken) { alert('Only admin can complete the queue'); return }
    setRemovingId(id)
    // wait for CSS animation to play
    setTimeout(async () => {
      try {
        await axios.post(`${API}/api/complete/${id}`, {}, { headers: { Authorization: `Bearer ${adminToken}` } })
        setRemovingId(null)
        // refresh queue soon after
        setTimeout(() => { if (mounted.current) fetchQueue() }, 120)
      } catch (e) { console.error(e); setRemovingId(null); alert('complete failed') }
    }, 380)
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">VQ</div>
        <div>
          <h1 className="title">XplorXR</h1>
          <div className="subtitle">Join the queue and take turns — head becomes #1 after completion</div>
        </div>
      </div>

      <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between'}}>
        <div style={{flex:1}}>
          <div className="join">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            <input value={studentIdInput} onChange={e => setStudentIdInput(e.target.value)} placeholder="Student ID (optional)" style={{width:160}} />
            <button className="btn" onClick={join}>Join Queue</button>
          </div>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {adminToken ? (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div className="meta">Admin</div>
              <button className="btn" onClick={adminLogout}>Logout</button>
            </div>
          ) : (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input placeholder="admin password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} style={{padding:8,borderRadius:8,background:'rgba(255,255,255,0.03)',border:'none',color:'inherit'}} />
              <button className="btn" onClick={adminLogin}>Admin Login</button>
            </div>
          )}
        </div>
      </div>

      <div className="queue-wrap">
        <ul className="queue">
          {queue.map(item => {
            const isHead = item.number === 1
            const classes = ['head']
            if (isHead) classes.push('head')
            if (item._id === lastAddedId) classes.push('new')
            if (item._id === removingId) classes.push('removing')
            return (
              <li key={item._id} className={classes.join(' ')}>
                <div className="num">{item.number}</div>
                <div className="name">{item.name}</div>
                <div className="meta">{item.studentId ? `ID: ${item.studentId} • #${item.number}` : `#${item.number}`}</div>
                {isHead && (
                  <button className="btn" onClick={() => complete(item._id)}>Complete</button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
