'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, X, Check, RotateCcw } from 'lucide-react';
import { useMailStore } from '@/stores/useMailStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const FilterPopover: React.FC = () => {
  const searchQuery = useMailStore((state) => state.searchQuery);
  const setSearchQuery = useMailStore((state) => state.setSearchQuery);

  const [isOpen, setIsOpen] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [sender, setSender] = useState('');
  const [datePreset, setDatePreset] = useState<'any' | 'today' | '7d' | '30d' | 'custom'>('any');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [readStatus, setReadStatus] = useState<'all' | 'unread' | 'read'>('all');

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync keywords from searchQuery if search query is updated externally
  useEffect(() => {
    if (!searchQuery) {
      setKeywords('');
      setSender('');
      setDatePreset('any');
      setStartDate('');
      setEndDate('');
      setReadStatus('all');
    }
  }, [searchQuery]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const hasActiveFilters = !!(
    sender.trim() ||
    datePreset !== 'any' ||
    readStatus !== 'all' ||
    searchQuery.trim()
  );

  const handleApply = () => {
    const queryParts: string[] = [];

    // 1. Keyword search text
    if (keywords.trim()) {
      queryParts.push(keywords.trim());
    }

    // 2. Sender filter (from:)
    if (sender.trim()) {
      const cleanSender = sender.trim();
      queryParts.push(cleanSender.includes(' ') ? `from:"${cleanSender}"` : `from:${cleanSender}`);
    }

    // 3. Date range filter
    if (datePreset === 'today') {
      const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      queryParts.push(`after:${todayStr}`);
    } else if (datePreset === '7d') {
      queryParts.push('newer_than:7d');
    } else if (datePreset === '30d') {
      queryParts.push('newer_than:30d');
    } else if (datePreset === 'custom') {
      if (startDate) {
        const formattedStart = startDate.replace(/-/g, '/');
        queryParts.push(`after:${formattedStart}`);
      }
      if (endDate) {
        // Gmail before: operator is exclusive. Add +1 day so end date is inclusive.
        const endD = new Date(endDate);
        endD.setDate(endD.getDate() + 1);
        const formattedNextDay = endD.toISOString().split('T')[0].replace(/-/g, '/');
        queryParts.push(`before:${formattedNextDay}`);
      }
    }

    // 4. Read status filter (is:unread / is:read)
    if (readStatus === 'unread') {
      queryParts.push('is:unread');
    } else if (readStatus === 'read') {
      queryParts.push('is:read');
    }

    const combinedQuery = queryParts.join(' ');
    setSearchQuery(combinedQuery);
    setIsOpen(false);
  };

  const handleClear = () => {
    setKeywords('');
    setSender('');
    setDatePreset('any');
    setStartDate('');
    setEndDate('');
    setReadStatus('all');
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3 text-xs gap-1.5 border-slate-800 hover:bg-slate-900 transition-colors ${
          hasActiveFilters ? 'text-blue-400 border-blue-800/60 bg-blue-950/30 font-semibold' : 'text-slate-400'
        }`}
        title="Filter emails"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-500/50" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl z-50 text-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
              <span>Email Search Filters</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">Keywords</label>
            <Input
              type="text"
              placeholder="Subject or body keywords..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="h-8 text-xs bg-slate-950/60 border-slate-800 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Sender */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">Sender (From)</label>
            <Input
              type="text"
              placeholder="sender@example.com or Name"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="h-8 text-xs bg-slate-950/60 border-slate-800 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Date Range Preset */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">Date Range</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="w-full h-8 rounded-md border border-slate-800 bg-slate-950/60 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="any">Any date</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range...</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-7 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-slate-400">End Date (Inclusive)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-7 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Read Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">Read Status</label>
            <select
              value={readStatus}
              onChange={(e) => setReadStatus(e.target.value as any)}
              className="w-full h-8 rounded-md border border-slate-800 bg-slate-950/60 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="all">All</option>
              <option value="unread">Unread only</option>
              <option value="read">Read only</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 text-xs text-slate-400 hover:text-slate-200 gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </Button>

            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1.5 px-4 shadow-sm"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Filters</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
