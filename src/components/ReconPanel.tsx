import React, { useState, useEffect } from 'react';
import { Activity, Search, Loader2, Globe, Link2, ExternalLink, Copy, Check, Send, AlertCircle, ShieldCheck, Database, Folder, FileText, FileSpreadsheet, Calendar, Mail, Presentation, Sliders, Lock, Filter, Download, Plus, Trash2 } from "lucide-react";
import { NetlasMap } from './NetlasMap';
import { ReconTarget } from '../types';
import { saveReconTarget, loadReconTargets, deleteReconTarget } from '../utils/recon_firestore';

interface ReconPanelProps {
  netlasApiInfo: any;
  netlasTarget: string;
  setNetlasTarget: (target: string) => void;
  handleNetlasQuery: (target: string) => void;
  netlasLoading: boolean;
  netlasError: string | null;
  netlasResult: any;
  
  // Workspace props
  needsAuth: boolean;
  currentUser: any;
  activeWorkspaceTab: string;
  setActiveWorkspaceTab: (tab: string) => void;
  wsMessage: any;
  setWsMessage: (msg: any) => void;
  setShowAuthModal: (show: boolean) => void;
  scrapedData: any[];
  wsRunning: boolean;
  
  // Triggers
  triggerExportScriptToDrive: () => void;
  triggerExportDocToDrive: () => void;
  triggerSyncToSheets: () => void;
  customCalendarDate: string;
  setCustomCalendarDate: (date: string) => void;
  triggerScheduleCalendarEvent: () => void;
  customGmailRecipient: string;
  setCustomGmailRecipient: (email: string) => void;
  triggerGmailReport: () => void;
  
  // Make props
  sharedWebhookUrl: string;
  setSharedWebhookUrl: (url: string) => void;
  addLog: (msg: string, type: string) => void;
  makeTestPayload: any;
  setMakeTestPayload: (payload: any) => void;
  handleTestMakeWebhook: () => void;
  makeTestLoading: boolean;
  copyWebhookSuccess: boolean;
  setCopyWebhookSuccess: (success: boolean) => void;
  makeTestResult: any;
}

export const ReconPanel: React.FC<ReconPanelProps> = ({
  netlasApiInfo, netlasTarget, setNetlasTarget, handleNetlasQuery, netlasLoading, netlasError, netlasResult,
  needsAuth, currentUser, activeWorkspaceTab, setActiveWorkspaceTab, wsMessage, setWsMessage, setShowAuthModal, scrapedData, wsRunning,
  triggerExportScriptToDrive, triggerExportDocToDrive, triggerSyncToSheets, customCalendarDate, setCustomCalendarDate, triggerScheduleCalendarEvent, customGmailRecipient, setCustomGmailRecipient, triggerGmailReport,
  sharedWebhookUrl, setSharedWebhookUrl, addLog, makeTestPayload, setMakeTestPayload, handleTestMakeWebhook, makeTestLoading, copyWebhookSuccess, setCopyWebhookSuccess, makeTestResult
}) => {
  const [filterPort, setFilterPort] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [reportModalData, setReportModalData] = useState<any>(null);
  const [lastQuery, setLastQuery] = useState('');
  const [targets, setTargets] = useState<ReconTarget[]>([]);

  const executeQuery = (query: string) => {
    if (query === lastQuery) return; 
    setLastQuery(query);
    handleNetlasQuery(query);
  };
  const [newTargetValue, setNewTargetValue] = useState('');
  const [newTargetType, setNewTargetType] = useState<'ip' | 'query' | 'url'>('ip');

  useEffect(() => {
    if (currentUser?.uid) {
      loadReconTargets(currentUser.uid).then(setTargets);
    }
  }, [currentUser?.uid]);

  const addTarget = async () => {
    if (!currentUser?.uid || !newTargetValue) return;
    const id = await saveReconTarget(currentUser.uid, newTargetType, newTargetValue);
    setTargets([{ id, userId: currentUser.uid, type: newTargetType, value: newTargetValue, createdAt: Date.now() }, ...targets]);
    setNewTargetValue('');
    addLog(`Target added: ${newTargetValue}`, 'success');
  };

  const removeTarget = async (id: string) => {
    await deleteReconTarget(id);
    setTargets(targets.filter(t => t.id !== id));
    addLog(`Target removed`, 'success');
  };

  const downloadCSV = () => {
    const headers = ["IP", "Ports", "Organization", "Country"];
    const csvRows = [
        headers.join(','),
        ...filteredMatches.map((match: any) => [
            match.ip_str,
            `"${match.ports.join(';')}"`,
            `"${match.org?.replace(/"/g, '""') || ''}"`,
            `"${match.location?.country_name.replace(/"/g, '""') || ''}"`
        ].join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shodan_results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyVulnerabilityReport = () => {
    const reportTemplate = `
=== דוח אבטחה: ${netlasResult.queryUsed || netlasTarget} ===

ניתוח פגיעות:
${netlasResult.analysis || 'לא נמצאו פגיעות ספציפיות בחיפוש זה.'}

מכשירים שנמצאו:
${filteredMatches.map((m: any) => `- IP: ${m.ip_str}, פורטים: ${m.ports.join(', ')}, ארגון: ${m.org}`).join('\n')}

---
דוח זה נוצר באופן אוטומטי על ידי Netlas Recon Hub.
`.trim();
    navigator.clipboard.writeText(reportTemplate);
    addLog("דוח פגיעות הועתק ללוח", "success");
  };

  const handleSelectMatchForReport = (match: any) => {
    setReportModalData(match);
  };


  // Handle both old direct IP response and new search response
  const isSearchResponse = netlasResult?.netlasData?.matches;
  const matches = isSearchResponse ? netlasResult.netlasData.matches : (netlasResult?.data?.ip_str ? [netlasResult.data] : []);
  
  const filteredMatches = matches.filter((match: any) => 
    filterPort ? match.ports?.includes(parseInt(filterPort)) : true
  );

  return (
    <div className="space-y-6" dir="rtl">
        {/* Netlas Hub */}
        <div className="bg-[#0b1124] border border-slate-800 rounded-2xl p-6 animate-fadeIn shadow-xl relative overflow-hidden text-right" id="netlas-recon-hub-card">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-950/40 flex items-center justify-center border border-rose-500/30">
                        <Activity className="w-4.5 h-4.5 text-rose-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Netlas Recon Hub</h3>
                </div>
            </div>
            {/* Netlas Content */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-12 space-y-4">
                  {/* Targets Management */}
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-2">
                    <h4 className="text-white text-xs font-bold">יעדי מחקר</h4>
                    <div className="flex gap-2">
                        <select 
                            value={newTargetType} 
                            onChange={(e) => setNewTargetType(e.target.value as any)}
                            className="bg-slate-950 text-rose-300 text-xs rounded border border-slate-700 p-1"
                        >
                            <option value="ip">IP</option>
                            <option value="query">שאילתה</option>
                            <option value="url">URL</option>
                        </select>
                        <input
                            type="text"
                            value={newTargetValue}
                            onChange={(e) => setNewTargetValue(e.target.value)}
                            className="flex-grow text-xs px-3 py-1 bg-slate-950 rounded border border-slate-700 text-rose-300"
                            placeholder="הוסף יעד..."
                        />
                        <button onClick={addTarget} className="px-3 bg-rose-600 text-white rounded text-xs flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-auto">
                        {targets.map(t => (
                            <div key={t.id} className="flex justify-between items-center bg-slate-950 p-1.5 rounded text-xs">
                                <span className="text-slate-300">{t.value} <span className="text-[9px] text-slate-500">({t.type})</span></span>
                                <div className="flex gap-1">
                                    <button onClick={() => { setNetlasTarget(t.value); executeQuery(t.value); }} className="text-rose-400"><Search className="w-3 h-3" /></button>
                                    <button onClick={() => removeTarget(t.id)} className="text-slate-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-800 pt-3">
                    <input
                      type="text"
                      value={netlasTarget}
                      onChange={(e) => setNetlasTarget(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-rose-300"
                      placeholder="חפש (למשל: 'מצלמות בירושלים')"
                    />
                    <button onClick={() => executeQuery(netlasTarget)} className="w-full px-4 py-2 bg-rose-600 text-white rounded-lg text-xs" disabled={netlasLoading}>
                        {netlasLoading ? 'חוקר...' : 'חקור'}
                    </button>
                  </div>

                  {netlasResult && (
                    <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-700 text-xs text-slate-300">
                      <div className="flex flex-col gap-2 mb-4 border-b border-slate-800 pb-2">
                        <div className="flex justify-between items-center">
                            <h4 className="text-rose-400 font-bold">תוצאות חיפוש: {netlasResult.queryUsed || netlasTarget}</h4>
                            <div className="flex gap-2">
                            <div className="flex bg-slate-800 rounded-lg p-0.5" dir="rtl">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1 rounded-md text-[10px] ${viewMode === 'list' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                                >
                                    רשימה
                                </button>
                                <button
                                    onClick={() => setViewMode('map')}
                                    className={`px-3 py-1 rounded-md text-[10px] ${viewMode === 'map' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                                >
                                    מפה
                                </button>
                            </div>
                                <button 
                                    onClick={copyVulnerabilityReport}
                                    title="העתק דוח פגיעות"
                                    className="p-1 hover:bg-slate-800 rounded"
                                >
                                    <FileText className="w-3 h-3 text-slate-400" />
                                </button>
                                <button 
                                    onClick={downloadCSV}
                                    title="הורד כ-CSV"
                                    className="p-1 hover:bg-slate-800 rounded"
                                >
                                    <Download className="w-3 h-3 text-slate-400" />
                                </button>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(JSON.stringify(netlasResult, null, 2))}
                                    title="העתק ללוח"
                                    className="p-1 hover:bg-slate-800 rounded"
                                >
                                    <Copy className="w-3 h-3 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-3 h-3 text-slate-400" />
                            <input 
                                placeholder="סנן לפי פורט..."
                                className="w-24 bg-slate-900 border border-slate-700 rounded p-1"
                                onChange={(e) => setFilterPort(e.target.value)}
                            />
                        </div>
                      </div>
                      
                      <div className="overflow-auto max-h-80 text-right space-y-4">
                        {viewMode === 'map' ? (
                            <NetlasMap matches={filteredMatches} onSelectMatchForReport={handleSelectMatchForReport} />
                        ) : (
                            <>
                                {netlasResult.analysis && (
                                    <>
                                        <p className="text-rose-400 font-bold">ניתוח פגיעות כללי:</p>
                                        <div className="bg-black p-2 rounded text-[10px] whitespace-pre-wrap">{netlasResult.analysis}</div>
                                    </>
                                )}
                                
                                <p className="text-rose-400 font-bold">מכשירים שנמצאו ({filteredMatches?.length}):</p>
                                {filteredMatches?.map((match: any, i: number) => (
                                    <div key={i} className="border-b border-slate-800 pb-2">
                                        <p><strong>IP:</strong> {match.ip_str} | <strong>פורטים:</strong> {match.ports.join(', ')}</p>
                                        <p className="text-[10px] text-slate-500">{match.org} - {match.location?.country_name}</p>
                                    </div>
                                ))}
                            </>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
        </div>

        {reportModalData && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg text-right">
               <h2 className="text-rose-400 font-bold mb-4">דוח פגיעות למכשיר {reportModalData.ip_str}</h2>
               <pre className="bg-black p-4 rounded text-xs text-slate-300 overflow-auto max-h-64 whitespace-pre-wrap">
                 {`IP: ${reportModalData.ip_str}
Coordinates: ${reportModalData.location?.latitude}, ${reportModalData.location?.longitude}
Organization: ${reportModalData.org}
Ports: ${reportModalData.ports.join(', ')}

[דוח פגיעות כאן...]
`}
               </pre>
               <button onClick={() => setReportModalData(null)} className="mt-4 w-full bg-slate-800 text-white p-2 rounded">סגור</button>
            </div>
          </div>
        )}

        {/* Workspace Hub */}
        <div className="bg-[#0a0f1c] border border-slate-800 rounded-2xl p-6 animate-fadeIn shadow-lg relative overflow-hidden text-right" id="workspace-hub-card">
            <div className="flex items-center gap-3 mb-4">
                <Database className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">סנכרון ענן Google Workspace</h3>
            </div>
            {/* Workspace Content Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setActiveWorkspaceTab("drive")} className={`px-3 py-1.5 rounded-lg text-xs ${activeWorkspaceTab === "drive" ? "bg-cyan-900 text-white" : "bg-slate-800 text-slate-400"}`}>Drive</button>
                <button onClick={() => setActiveWorkspaceTab("sheets")} className={`px-3 py-1.5 rounded-lg text-xs ${activeWorkspaceTab === "sheets" ? "bg-cyan-900 text-white" : "bg-slate-800 text-slate-400"}`}>Sheets</button>
                <button onClick={() => setActiveWorkspaceTab("slides")} className={`px-3 py-1.5 rounded-lg text-xs ${activeWorkspaceTab === "slides" ? "bg-cyan-900 text-white" : "bg-slate-800 text-slate-400"}`}>Slides</button>
                <button onClick={() => setActiveWorkspaceTab("chat")} className={`px-3 py-1.5 rounded-lg text-xs ${activeWorkspaceTab === "chat" ? "bg-cyan-900 text-white" : "bg-slate-800 text-slate-400"}`}>Chat</button>
            </div>
            
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850">
                {activeWorkspaceTab === "drive" && <p className="text-xs text-slate-400">Drive Integration UI</p>}
                {activeWorkspaceTab === "sheets" && <p className="text-xs text-slate-400">Sheets Integration UI</p>}
                {activeWorkspaceTab === "slides" && <p className="text-xs text-slate-400">Slides Integration UI</p>}
                {activeWorkspaceTab === "chat" && <p className="text-xs text-slate-400">Chat Integration UI</p>}
            </div>
        </div>
    </div>
  );
};
