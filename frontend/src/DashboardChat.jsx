import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as pbi from 'powerbi-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const REPORT_ID = import.meta.env.VITE_POWERBI_REPORT_ID;

// ── Inline styles (no Tailwind needed) ──────────────────────────────────────

const S = {
  root: {
    display: 'flex', height: '100vh', overflow: 'hidden',
    fontFamily: 'var(--font-sans)', background: 'var(--bg)',
  },
  // Dashboard panel
  dashPanel: {
    flex: '1 1 0', display: 'flex', flexDirection: 'column',
    borderRight: '1px solid var(--border)',
  },
  dashHeader: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 20px', borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  logo: {
    width: 28, height: 28,
  },
  dashTitle: {
    fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em',
    color: 'var(--text)', textTransform: 'uppercase',
  },
  statusDot: (ok) => ({
    width: 7, height: 7, borderRadius: '50%', marginLeft: 'auto',
    background: ok ? 'var(--success)' : 'var(--text-muted)',
    boxShadow: ok ? '0 0 6px var(--success)' : 'none',
    transition: 'all 0.3s',
  }),
  statusLabel: {
    fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
  },
  embedContainer: {
    flex: 1, position: 'relative', background: '#0f1420',
  },
  embedFrame: {
    width: '100%', height: '100%', border: 'none',
  },
  embedPlaceholder: {
    position: 'absolute', inset: 0, display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '16px', color: 'var(--text-muted)',
  },
  placeholderIcon: { fontSize: '40px', opacity: 0.3 },
  placeholderText: { fontSize: '13px', fontFamily: 'var(--font-mono)' },

  // Filter chips
  filterBar: {
    display: 'flex', flexWrap: 'wrap', gap: '6px',
    padding: '10px 16px', borderTop: '1px solid var(--border)',
    background: 'var(--surface)', minHeight: '44px', alignItems: 'center',
  },
  filterLabel: {
    fontSize: '10px', fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
    marginRight: '4px',
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
    borderRadius: '4px', padding: '3px 8px',
    fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-glow)',
  },
  chipRemove: {
    cursor: 'pointer', opacity: 0.6, fontSize: '12px', lineHeight: 1,
    background: 'none', border: 'none', color: 'var(--accent-glow)',
    padding: '0 0 0 2px',
  },

  // Chat panel
  chatPanel: {
    width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column',
    background: 'var(--surface)', position: 'relative',
  },
  chatHeader: {
    padding: '14px 20px', borderBottom: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: '2px',
  },
  chatTitle: {
    fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em',
    color: 'var(--text)', textTransform: 'uppercase',
  },
  chatSubtitle: {
    fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '16px', display: 'flex',
    flexDirection: 'column', gap: '12px',
  },
  msg: (role) => ({
    display: 'flex', flexDirection: 'column',
    alignItems: role === 'user' ? 'flex-end' : 'flex-start',
    gap: '3px',
  }),
  msgLabel: (role) => ({
    fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: role === 'user' ? 'var(--accent-glow)' : 'var(--text-muted)',
  }),
  bubble: (role) => ({
    maxWidth: '88%', padding: '10px 13px', borderRadius: '8px',
    fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    background: role === 'user'
      ? 'var(--accent)'
      : 'var(--surface2)',
    color: role === 'user' ? '#fff' : 'var(--text)',
    border: role === 'user' ? 'none' : '1px solid var(--border)',
  }),
  insightBubble: {
    maxWidth: '88%', padding: '10px 13px', borderRadius: '8px',
    fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    background: 'rgba(16,185,129,0.08)',
    color: 'var(--success)',
    border: '1px solid rgba(16,185,129,0.25)',
  },
  errorBubble: {
    maxWidth: '88%', padding: '10px 13px', borderRadius: '8px',
    fontSize: '13px', lineHeight: '1.6',
    background: 'rgba(239,68,68,0.08)',
    color: 'var(--error)',
    border: '1px solid rgba(239,68,68,0.25)',
  },
  daxBlock: {
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    background: '#0a0d14', border: '1px solid var(--border)',
    borderRadius: '4px', padding: '8px 10px',
    color: '#7dd3fc', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    marginTop: '6px', maxWidth: '88%',
  },
  thinkingDots: {
    display: 'flex', gap: '5px', padding: '12px 14px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '8px', alignSelf: 'flex-start',
  },
  dot: (i) => ({
    width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)',
    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
  }),
  // Input
  inputArea: {
    padding: '14px 16px', borderTop: '1px solid var(--border)',
    display: 'flex', gap: '8px', alignItems: 'flex-end',
    background: 'var(--surface)',
  },
  textarea: {
    flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '10px 12px', color: 'var(--text)',
    fontSize: '13px', fontFamily: 'var(--font-sans)', resize: 'none',
    outline: 'none', lineHeight: '1.5', maxHeight: '100px',
    transition: 'border-color 0.2s',
  },
  sendBtn: (disabled) => ({
    padding: '10px 16px', borderRadius: '8px', border: 'none',
    background: disabled ? 'var(--border)' : 'var(--accent)',
    color: disabled ? 'var(--text-muted)' : '#fff',
    fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s', flexShrink: 0, fontFamily: 'var(--font-sans)',
    letterSpacing: '0.02em',
  }),
  // Schema badge
  schemaBadge: {
    position: 'absolute', bottom: '80px', right: '16px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '6px', padding: '6px 10px',
    fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
};

// CSS keyframes injected once
const injectKeyframes = () => {
  if (document.getElementById('pbi-agent-kf')) return;
  const style = document.createElement('style');
  style.id = 'pbi-agent-kf';
  style.textContent = `
    @keyframes pulse {
      0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .pbi-msg { animation: fadeIn 0.25s ease forwards; }
    textarea:focus { border-color: var(--accent) !important; }
  `;
  document.head.appendChild(style);
};

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardChat() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Connected to Power BI Agent. Ask me to filter the dashboard, run queries, or surface insights from your data.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);
  const [schema, setSchema] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);

  const embedContainerRef = useRef(null);
  const reportRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pbiServiceRef = useRef(null);

  useEffect(() => {
    injectKeyframes();
    initPowerBI();
    fetchSchema();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Power BI Embed ─────────────────────────────────────────────────────────

  const initPowerBI = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/get-embed-token`);
      const { token, embedUrl } = res.data;

      const service = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );
      pbiServiceRef.current = service;

      const config = {
        type: 'report',
        id: REPORT_ID,
        embedUrl,
        accessToken: token,
        tokenType: pbi.models.TokenType.Embed,
        settings: {
          panes: { filters: { visible: false }, pageNavigation: { visible: true } },
          background: pbi.models.BackgroundType.Transparent,
        },
      };

      const report = service.embed(embedContainerRef.current, config);
      reportRef.current = report;

      report.on('loaded', () => setEmbedReady(true));
      report.on('error', (e) => console.error('PBI embed error:', e));
    } catch (err) {
      console.error('Failed to initialise Power BI embed:', err);
      addMsg('ai', '⚠️ Could not connect to Power BI. Check your credentials in .env.');
    }
  };

  // ── Schema ─────────────────────────────────────────────────────────────────

  const fetchSchema = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/get-schema`);
      setSchema(res.data?.value || []);
    } catch {
      // schema fetch is best-effort; the LLM will still work with whatever it gets
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const addMsg = (role, content, extra = {}) =>
    setMessages(prev => [...prev, { role, content, ...extra }]);

  const applyFiltersToReport = async (filters) => {
    if (!reportRef.current || !filters?.length) return;
    try {
      const pbiFilters = filters.map(f => ({
        $schema: 'http://powerbi.com/product/schema#basic',
        target: { table: f.table, column: f.column },
        operator: f.operator || 'In',
        values: f.values,
        filterType: pbi.models.FilterType.Basic,
      }));
      await reportRef.current.updateFilters(pbi.models.FiltersOperations.Add, pbiFilters);
      setActiveFilters(prev => [...prev, ...filters]);
    } catch (err) {
      console.error('Filter apply error:', err);
    }
  };

  const removeFilter = async (index) => {
    const updated = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(updated);
    if (!reportRef.current) return;
    try {
      if (updated.length === 0) {
        await reportRef.current.removeFilters();
      } else {
        const pbiFilters = updated.map(f => ({
          $schema: 'http://powerbi.com/product/schema#basic',
          target: { table: f.table, column: f.column },
          operator: f.operator || 'In',
          values: f.values,
          filterType: pbi.models.FilterType.Basic,
        }));
        await reportRef.current.updateFilters(pbi.models.FiltersOperations.Replace, pbiFilters);
      }
    } catch (err) {
      console.error('Filter remove error:', err);
    }
  };

  const executeDax = async (daxQuery) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/execute-dax`, { query: daxQuery });
      const rows = res.data?.results?.[0]?.tables?.[0]?.rows;
      if (!rows?.length) return null;
      return JSON.stringify(rows.slice(0, 30), null, 2);
    } catch (err) {
      console.error('DAX error:', err);
      return null;
    }
  };

  // ── Chat Submit ────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const msg = input.trim();
    if (!msg || isLoading) return;

    addMsg('user', msg);
    setInput('');
    setIsLoading(true);

    try {
      // Turn 1 – ask AI what to do
      const res1 = await axios.post(`${BACKEND_URL}/chat`, {
        message: msg,
        schema_tables: schema,
      });
      const ai1 = res1.data;

      // Unsupported
      if (ai1.status === 'error' || ai1.query_type === 'unsupported') {
        addMsg('ai', ai1.message || 'The dataset cannot answer this query.', { isError: true });
        setIsLoading(false);
        return;
      }

      // Apply filters (always, even if needs_dax)
      if (ai1.filters?.length) {
        await applyFiltersToReport(ai1.filters);
      }

      // If just a filter query with insight already
      if (!ai1.needs_dax && ai1.insight) {
        addMsg('ai', ai1.insight, { isInsight: true, filters: ai1.filters });
        setIsLoading(false);
        return;
      }

      // If just a filter query with no insight
      if (!ai1.needs_dax && !ai1.insight) {
        addMsg('ai', ai1.filters?.length ? 'Filters applied to the dashboard.' : 'Done.');
        setIsLoading(false);
        return;
      }

      // Needs DAX – run query then Turn 2
      if (ai1.needs_dax && ai1.dax_query) {
        addMsg('ai', '⏳ Running DAX query against the dataset…');
        const daxResult = await executeDax(ai1.dax_query);

        const res2 = await axios.post(`${BACKEND_URL}/chat`, {
          message: msg,
          schema_tables: schema,
          dax_result: daxResult || 'No data returned.',
        });
        const ai2 = res2.data;

        if (ai2.insight) {
          addMsg('ai', ai2.insight, { isInsight: true, dax: ai1.dax_query });
        } else {
          addMsg('ai', 'Query ran but no insight was generated.', { dax: ai1.dax_query });
        }
      }
    } catch (err) {
      console.error(err);
      addMsg('ai', 'An error occurred while processing your request.', { isError: true });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, schema, activeFilters]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Schema summary for badge ───────────────────────────────────────────────
  const schemaInfo = schema.length
    ? `${schema.length} table${schema.length !== 1 ? 's' : ''} · ${schema.reduce((a, t) => a + (t.columns?.length || 0), 0)} columns`
    : 'schema loading…';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>
      {/* ── Dashboard panel ── */}
      <div style={S.dashPanel}>
        <div style={S.dashHeader}>
          {/* Power BI logo SVG */}
          <svg style={S.logo} viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#F2C811"/>
            <rect x="6" y="18" width="4" height="8" rx="1" fill="#1E1E1E"/>
            <rect x="14" y="12" width="4" height="14" rx="1" fill="#1E1E1E"/>
            <rect x="22" y="6" width="4" height="20" rx="1" fill="#1E1E1E"/>
          </svg>
          <span style={S.dashTitle}>Power BI · Dashboard</span>
          <span style={S.statusLabel}>{embedReady ? 'connected' : 'connecting…'}</span>
          <span style={S.statusDot(embedReady)} />
        </div>

        <div style={S.embedContainer}>
          <div ref={embedContainerRef} style={{ width: '100%', height: '100%' }} />
          {!embedReady && (
            <div style={S.embedPlaceholder}>
              <span style={S.placeholderIcon}>📊</span>
              <span style={S.placeholderText}>Connecting to Power BI…</span>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        <div style={S.filterBar}>
          {activeFilters.length === 0 ? (
            <span style={S.filterLabel}>No active filters</span>
          ) : (
            <>
              <span style={S.filterLabel}>Filters</span>
              {activeFilters.map((f, i) => (
                <span key={i} style={S.chip}>
                  <span>{f.table}[{f.column}]: {f.values.join(', ')}</span>
                  <button style={S.chipRemove} onClick={() => removeFilter(i)}>✕</button>
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div style={S.chatPanel}>
        <div style={S.chatHeader}>
          <span style={S.chatTitle}>BI Agent</span>
          <span style={S.chatSubtitle}>Powered by GPT-4o · Power BI REST API</span>
        </div>

        <div style={S.messages}>
          {messages.map((m, i) => (
            <div key={i} className="pbi-msg" style={S.msg(m.role)}>
              <span style={S.msgLabel(m.role)}>{m.role === 'user' ? 'You' : 'Agent'}</span>
              <div style={
                m.isError ? S.errorBubble
                : m.isInsight ? S.insightBubble
                : S.bubble(m.role)
              }>
                {m.content}
              </div>
              {m.dax && (
                <div style={S.daxBlock}>{m.dax}</div>
              )}
              {m.filters?.length > 0 && (
                <div style={{ ...S.daxBlock, color: '#86efac', marginTop: 4 }}>
                  {m.filters.map((f, fi) =>
                    `${f.table}[${f.column}] IN [${f.values.join(', ')}]`
                  ).join('\n')}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={S.thinkingDots}>
              {[0,1,2].map(i => <span key={i} style={S.dot(i)} />)}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Schema badge */}
        <div style={S.schemaBadge}>{schemaInfo}</div>

        <div style={S.inputArea}>
          <textarea
            rows={2}
            style={S.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Filter by year, ask for top insights…"
            disabled={isLoading}
          />
          <button
            style={S.sendBtn(isLoading || !input.trim())}
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}