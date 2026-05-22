import { useState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Database, Search, XCircle, File } from 'lucide-react'
import axios from 'axios'

// Prefer Vite dev-server proxy for /api (see vite.config.js)
// Use absolute backend URL to avoid dev-proxy flakiness
const api = axios.create({ baseURL: 'http://127.0.0.1:8000' })

function App() {
  const [query, setQuery] = useState('')
  const [llmResponse, setLlmResponse] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history')
      setHistory(res.data)
    } catch (e) {
      console.error("Failed to fetch history:", e)
    }
  }

  const checkHallucination = async () => {
    setLoading(true)
    try {
      const payload = llmResponse || 'Demo LLM response with papers.'
      const res = await api.post('/check', { query: query || 'Demo query', response: payload })
      setResults(res.data)


      fetchHistory()
      setLoading(false)
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message))
      setLoading(false)
    }
  }

  const handleDrag = function (e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = function (e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = function (e) {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0])
    }
  }

  const uploadFile = async (file) => {
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      alert("Only PDF and DOCX files are supported.")
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResults(res.data)
      fetchHistory()
    } catch (error) {
      alert('Upload Error: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (scoreOrRisk) => {
    // Backend now returns `overall_score` (0..1 integrity) and `risk` (0..100).
    // Use whichever is available.
    const score = typeof scoreOrRisk === 'number' ? scoreOrRisk : 0;
    // Heuristic: if it looks like a risk percentage, invert mapping.
    if (score > 1) {
      const risk = score; // 0..100
      if (risk <= 25) return '#10B981';
      if (risk <= 60) return '#F59E0B';
      return '#EF4444';
    }
    // Legacy: 0..1 integrity confidence
    if (score > 0.8) return '#10B981';
    if (score > 0.5) return '#F59E0B';
    return '#EF4444';
  }

  const getVerdictIcon = (verdict) => {
    if (verdict === 'REAL') return <CheckCircle className="text-emerald-500 w-8 h-8" />
    if (verdict === 'SUSPICIOUS') return <AlertTriangle className="text-amber-500 w-8 h-8" />
    return <XCircle className="text-rose-500 w-8 h-8" />
  }


  const pieData = results ? [
    { name: 'Integrity', value: results.overall_score || results.llm_confidence, color: getScoreColor(results.overall_score || results.llm_confidence) },
    { name: 'Risk', value: 1 - (results.overall_score || results.llm_confidence), color: '#334155' }
  ] : []

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto text-slate-200">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
          Neural Research Sentinel
        </h1>
        <p className="text-lg text-slate-400 font-light">
          Advanced AI Hallucination & Fabrication Detection
        </p>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Input Area */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* File Upload Zone */}
          <div 
            className={`glass-panel p-8 text-center upload-dropzone ${dragActive ? "active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              accept=".pdf,.docx" 
              onChange={handleFileChange} 
            />
            <UploadCloud className="w-16 h-16 mx-auto mb-4 text-cyan-400 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Upload Research Document</h3>
            <p className="text-slate-400">Drag & Drop PDF or Word (.docx) files here, or click to browse</p>
          </div>

          <div className="flex items-center justify-center gap-4 text-slate-500 font-semibold uppercase text-sm">
            <div className="h-px bg-slate-700 w-16"></div>
            OR PASTE TEXT
            <div className="h-px bg-slate-700 w-16"></div>
          </div>

          <div className="glass-panel p-6">
            <div className="mb-4">
              <label className="block mb-2 font-medium text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4" /> Research Claim / Query
              </label>
              <input 
                placeholder="e.g., Transformers improved NLP accuracy significantly..." 
                className="w-full p-3 glass-input rounded-lg"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            
            <div className="mb-6">
              <label className="block mb-2 font-medium text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4" /> AI Generated Response
              </label>
              <textarea 
                placeholder="Paste the text containing citations to verify..." 
                className="w-full p-3 glass-input rounded-lg h-32 resize-none"
                value={llmResponse}
                onChange={e => setLlmResponse(e.target.value)}
              />
            </div>
            
            <button 
              onClick={checkHallucination} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <><Search className="w-5 h-5" /> Analyze Integrity</>
              )}
            </button>
          </div>
        </motion.div>

        {/* Right Column - Results & Score */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="glass-panel p-6 text-center relative overflow-hidden">
            <h3 className="font-bold text-lg mb-4 text-slate-300 tracking-wide uppercase">Integrity Score</h3>
            
            {results ? (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={results.timestamp}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  <div className="flex justify-center items-center gap-3 mb-2">
                    {getVerdictIcon(results.llm_verdict)}
                    <h2 className="text-3xl font-extrabold" style={{color: getScoreColor(results.overall_score || results.llm_confidence)}}>
                      {results.llm_verdict || 'N/A'}
                    </h2>
                  </div>
                  
                  <div className="relative h-48 w-full my-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={pieData} 
                          dataKey="value" 
                          cx="50%" cy="50%" 
                          innerRadius={60}
                          outerRadius={80}
                          stroke="none"
                        >
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black" style={{color: getScoreColor(results.overall_score || results.llm_confidence)}}>
                        {Math.round((results.overall_score || results.llm_confidence || 0) * 100)}%
                      </span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Score</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    {results.reason}
                  </p>

                  {Array.isArray(results.suspicious_sections) && results.suspicious_sections.length > 0 && (
                    <div className="mt-4 text-left">
                      <h4 className="text-sm font-bold text-rose-300 mb-2">Suspicious Sections</h4>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                        {results.suspicious_sections.map((s, i) => (
                          <div
                            key={i}
                            className="bg-rose-900/20 border border-rose-800/30 text-rose-200 p-3 rounded-lg text-xs leading-relaxed"
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center opacity-40">
                <ShieldIcon />
                <p className="mt-4 text-sm font-medium">Awaiting analysis data...</p>
              </div>
            )}
          </div>

          {/* History Panel */}
          <div className="glass-panel p-6 flex flex-col h-64">
            <h3 className="font-bold text-lg mb-4 text-slate-300 tracking-wide uppercase flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" /> Recent Scans
            </h3>
            <div className="overflow-y-auto flex-1 space-y-3 pr-2">
              {history.length > 0 ? history.map((item, idx) => (
                <div key={idx} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-700/40 transition-colors cursor-pointer text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-slate-200 truncate pr-2">
                      {item.filename || item.claim?.substring(0, 30) + '...'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" 
                          style={{backgroundColor: `${getScoreColor(item.overall_score)}20`, color: getScoreColor(item.overall_score)}}>
                      {Math.round(item.overall_score * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500 italic text-center mt-8">No history found</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Analysis Details Panel */}
      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Real Evidence */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
                <File className="w-5 h-5 text-blue-400" /> Retrieved Evidence
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {results.evidence_papers?.length > 0 ? results.evidence_papers.map((p, i) => (
                  <div key={i} className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50">
                    <h5 className="font-semibold text-blue-300">{p.title}</h5>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      {p.abstract?.substring(0, 180)}...
                    </p>
                    <div className="flex gap-3 mt-3 text-xs font-medium text-slate-500">
                      <span className="bg-slate-900 px-2 py-1 rounded">{p.year || 'N/A'}</span>
                      <span className="bg-slate-900 px-2 py-1 rounded truncate">DOI: {p.doi || 'N/A'}</span>
                    </div>
                  </div>
                )) : <p className="text-slate-500">No supporting evidence found.</p>}
              </div>
            </div>

            {/* Authentic Suggestions (If Fabricated) */}
            <div className="glass-panel p-6 border-t-4 border-t-purple-500">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
                <CheckCircle className="w-5 h-5 text-purple-400" /> Authentic Alternatives
              </h3>
              {(results.suggestions && results.suggestions.length > 0) ? (
                <div className="space-y-4">
                  <p className="text-sm text-purple-300 mb-4 bg-purple-900/20 p-3 rounded border border-purple-800/30">
                    We detected potential hallucinations. Here are actual published papers related to this topic:
                  </p>
                  {results.suggestions.map((p, i) => (
                    <div key={i} className="bg-gradient-to-r from-slate-800/40 to-purple-900/10 p-4 rounded-lg border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                      <h5 className="font-semibold text-purple-300">{p.title}</h5>
                      <p className="text-slate-400 text-sm mt-2">
                        Authors: {p.authors?.map(a => a.name).join(', ')}
                      </p>
                      <div className="flex gap-3 mt-3 text-xs font-medium text-slate-400">
                        <span className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded">Citations: {p.citationCount || 0}</span>
                        <span className="bg-slate-800 px-2 py-1 rounded">Year: {p.year || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 opacity-50">
                  <CheckCircle className="w-12 h-12 mb-3 text-emerald-500" />
                  <p className="text-center font-medium">Claims appear supported by retrieved evidence.<br/>No alternatives needed.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg className="w-16 h-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

export default App
