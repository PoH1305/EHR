'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, FileText, Clock } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useEHIStore } from '@/store/useEHIStore'
import { cn, debounce } from '@/lib/utils'
import { db } from '@/lib/db'
import type { SearchResult, PatientProfile, ClinicalNote } from '@/lib/types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const { patient } = useUserStore()
  const { records } = useEHIStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ehi:recentSearches')
      if (stored) setRecentSearches(JSON.parse(stored) as string[])
    } catch { /* ignore */ }
  }, [])

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchRecords = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) {
        setResults([])
        return
      }
      setIsSearching(true)
      try {
        const queryStr = q.toLowerCase()
        const localResults: SearchResult[] = []

        if (!db) return

        // 1. Search Patients (Doctors only typically, but we'll search if available)
        const patients = await db.patient_profiles
          .filter((p: PatientProfile) => 
            p.name.toLowerCase().includes(queryStr) || 
            p.healthId.toLowerCase().includes(queryStr)
          )
          .limit(5)
          .toArray()

        patients.forEach(p => {
          localResults.push({
            resourceId: p.id,
            resourceType: 'Patient',
            relevance: 1,
            snippet: `Health ID: ${p.healthId}`
          })
        })

        // 2. Search Clinical Notes
        const notes = await db.clinical_notes
          .filter((n: ClinicalNote) => n.content.toLowerCase().includes(queryStr))
          .limit(5)
          .toArray()

        notes.forEach((n: ClinicalNote) => {
          localResults.push({
            resourceId: n.id,
            resourceType: n.type.replace('_', ' '),
            relevance: 0.9,
            snippet: n.content.substring(0, 60) + '...'
          })
        })

        // 3. Fallback to API for deep record analysis if needed, 
        // but for now local is faster and more privacy-preserving
        setResults(localResults)
      } catch (err) {
        console.error('Search error:', err)
      }
      setIsSearching(false)
    }, 300),
    [records, patient?.id]
  )

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setSelectedIndex(0)
    void searchRecords(value)
  }

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5)
    setRecentSearches(updated)
    try {
      localStorage.setItem('ehi:recentSearches', JSON.stringify(updated))
    } catch { /* ignore */ }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      saveRecentSearch(query)
      const result = results[selectedIndex]
      onClose()
      window.location.href = `/records?resourceId=${result.resourceId}`
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          className="relative glass-card rounded-3xl w-full max-w-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-foreground/5">
            <Search className={cn('w-5 h-5 flex-shrink-0', isSearching ? 'text-primary animate-pulse' : 'text-foreground/30')} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search your health records..."
              className="flex-1 bg-transparent text-foreground placeholder-foreground/30 text-sm focus:outline-none"
            />
            <kbd className="hidden sm:block px-2 py-0.5 rounded bg-foreground/[0.05] text-[10px] text-foreground/30 font-mono">
              ESC
            </kbd>
            <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60 sm:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {results.length > 0 ? (
              <div className="py-2">
                {results.map((result, i) => (
                  <button
                    key={result.resourceId}
                    className={cn(
                      'w-full flex items-start gap-3 px-5 py-3 text-left transition-colors',
                      i === selectedIndex ? 'bg-foreground/[0.05]' : 'hover:bg-foreground/[0.02]'
                    )}
                    onClick={() => {
                      saveRecentSearch(query)
                      onClose()
                      window.location.href = `/records?resourceId=${result.resourceId}`
                    }}
                  >
                    <FileText className="w-4 h-4 text-foreground/30 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">{result.resourceType}</p>
                      <p className="text-xs text-foreground/40 truncate">{result.snippet}</p>
                    </div>
                    <span className="text-[10px] text-foreground/20 tabular-nums flex-shrink-0">
                      {Math.round(result.relevance * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            ) : query.length === 0 && recentSearches.length > 0 ? (
              <div className="py-2">
                <p className="px-5 py-1 text-[10px] text-foreground/20 uppercase tracking-wider">Recent</p>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    className="w-full flex items-center gap-3 px-5 py-2 text-left hover:bg-foreground/[0.02] transition-colors"
                    onClick={() => handleQueryChange(term)}
                  >
                    <Clock className="w-3.5 h-3.5 text-foreground/20" />
                    <span className="text-sm text-foreground/50">{term}</span>
                  </button>
                ))}
              </div>
            ) : query.length > 0 && !isSearching ? (
              <div className="py-8 text-center">
                <p className="text-sm text-foreground/30">No results found</p>
              </div>
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
