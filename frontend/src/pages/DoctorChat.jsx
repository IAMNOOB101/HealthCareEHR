import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  Send, Search, Lock, MessageSquare,
  Wifi, WifiOff, Loader2, User,
  ShieldCheck, CalendarDays, Timer, Check, Info
} from 'lucide-react';
import { staffChatService } from '../api/chat.service';
import { deriveRoomKey, encryptMessage, decryptMessage } from '../utils/chatCrypto';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

/* ── Patient list item ───────────────────────────────────────────────── */
const PatientItem = ({ item, isSelected, onClick }) => {
  const patient = item.Patient || {};
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();
  const expired = item.eligible === false;

  return (
    <button
      onClick={() => !expired && onClick(item)}
      disabled={expired}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group mb-1 ${
        expired ? 'opacity-60 cursor-not-allowed bg-slate-50' :
        isSelected
          ? 'bg-blue-50 border-blue-200 shadow-sm'
          : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
      } border`}
    >
      <div className={`relative h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all ${
        isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
      }`}>
        {initials || 'P'}
        {item.eligible && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
          {patient.firstName} {patient.lastName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.latestAppointment && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {item.latestAppointment.type}
            </span>
          )}
        </div>
      </div>
      {item.daysRemaining != null && item.daysRemaining > 0 && (
        <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
          item.daysRemaining <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          <Timer className="h-3 w-3" />
          {item.daysRemaining}d
        </div>
      )}
      {expired && (
        <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Expired</span>
      )}
    </button>
  );
};

/* ── Message bubble ──────────────────────────────────────────────────── */
const MessageBubble = ({ msg, user }) => {
  const isOwn = msg.senderType === 'doctor';
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-in`}>
      {!isOwn && (
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center mr-2 flex-shrink-0 mt-auto mb-5">
          <User className="h-4 w-4 text-slate-600" />
        </div>
      )}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-2.5 text-[15px] shadow-sm ${
          isOwn
            ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-bl-sm'
        }`}>
          {msg.decrypted ? (
            <span className="leading-relaxed whitespace-pre-wrap">{msg.plaintext}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm opacity-80 italic">
              <Lock className="h-3.5 w-3.5 animate-pulse" /> Decrypting securely...
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-[11px] mt-1.5 ${isOwn ? 'text-blue-600/70' : 'text-slate-400'}`}>
          {isOwn && <Lock className="h-2.5 w-2.5" />}
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isOwn && <Check className="h-3 w-3 ml-0.5" />}
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────────── */
const DoctorChat = () => {
  const { user, token } = useSelector((s) => s.auth);
  const [existingPatients, setExistingPatients] = useState([]);
  const [eligiblePatients, setEligiblePatients] = useState([]);
  const [activeTab, setActiveTab] = useState('conversations');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [roomKey, setRoomKey] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Load patients ──────────────────────────────────────────────────
  useEffect(() => {
    setLoadingPatients(true);
    Promise.all([
      staffChatService.getPatients(),
      staffChatService.getEligiblePatients(),
    ]).then(([existRes, eligRes]) => {
      setExistingPatients(existRes?.data || []);
      setEligiblePatients(eligRes?.data || []);
      if (existRes?.doctorId) setDoctorId(existRes.doctorId);
      else if (eligRes?.doctorId) setDoctorId(eligRes.doctorId);
    }).catch(console.error).finally(() => setLoadingPatients(false));
  }, []);

  // ── Socket connection ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedItem || !token || !doctorId) return;
    const portalUserId = selectedItem.portalUserId || selectedItem.id;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => { setConnected(true); socket.emit('chat:join', { portalUserId }); });
    socket.on('chat:joined', async (payload) => {
      const roomId = payload.roomId || `chat_${payload.patientId}_${doctorId}`;
      const rKey = await deriveRoomKey(roomId);
      setRoomKey({ key: rKey, roomId, patientId: payload.patientId, portalUserId });
    });
    socket.on('chat:message', async (msg) => {
      let plaintext = '(Unable to decrypt)';
      try {
        const pId = selectedItem.patientId || selectedItem.Patient?.id;
        const rmKey = await deriveRoomKey(`chat_${pId}_${doctorId}`);
        plaintext = await decryptMessage(rmKey, msg.ciphertext, msg.iv);
      } catch (_) {}
      setMessages(prev => [...prev, { ...msg, plaintext, decrypted: true }]);
    });
    socket.on('chat:typing', ({ senderType, isTyping: typing }) => { if (senderType === 'patient') setIsTyping(typing); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:error', (e) => console.error('[Chat]', e.message));

    return () => { socket.disconnect(); setConnected(false); setRoomKey(null); setMessages([]); };
  }, [selectedItem, token, doctorId]);

  // ── Load history ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomKey || !selectedItem) return;
    setLoadingHistory(true);
    const portalUserId = selectedItem.portalUserId || selectedItem.id;
    staffChatService.getHistory(portalUserId)
      .then(async (res) => {
        const rows = res?.data || [];
        const decrypted = await Promise.all(rows.map(async (m) => {
          let plaintext = '(Unable to decrypt)';
          try { plaintext = await decryptMessage(roomKey.key, m.ciphertext, m.iv); } catch (_) {}
          return { ...m, plaintext, decrypted: true };
        }));
        setMessages(decrypted);
      }).catch(() => {}).finally(() => setLoadingHistory(false));
  }, [roomKey, selectedItem]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !socketRef.current || !roomKey || sending) return;
    setSending(true);
    try {
      const { ciphertext, iv } = await encryptMessage(roomKey.key, inputText.trim());
      socketRef.current.emit('chat:message', { ciphertext, iv });
      setInputText('');
    } finally { setSending(false); }
  }, [inputText, roomKey, sending]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socketRef.current) return;
    socketRef.current.emit('chat:typing', { isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { socketRef.current?.emit('chat:typing', { isTyping: false }); }, 1500);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const displayList = (activeTab === 'conversations' ? existingPatients : eligiblePatients)
    .filter(item => {
      const p = item.Patient || {};
      return `${p.firstName} ${p.lastName} ${item.email || ''} ${item.PortalUser?.email || ''}`.toLowerCase().includes(search.toLowerCase());
    });

  const selectedPatient = selectedItem?.Patient || {};
  const tabs = [
    { id: 'conversations', label: 'Active Chats', count: existingPatients.length },
    { id: 'eligible', label: 'Eligible', count: eligiblePatients.length },
  ];

  return (
    <div className="h-[calc(100vh-6rem)] flex overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200 m-4">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Secure Messages</h2>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Lock className="h-3 w-3" /> E2E Encrypted
                </div>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 rounded-lg p-1 mb-4">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {tab.label} <span className="ml-1 opacity-60">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loadingPatients ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900">No patients found</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Patients with an appointment in the last 30 days will appear here.
              </p>
            </div>
          ) : (
            displayList.map(item => (
              <PatientItem key={`${item.patientId}-${item.portalUserId}`} item={item}
                isSelected={selectedItem?.patientId === item.patientId && selectedItem?.portalUserId === item.portalUserId}
                onClick={setSelectedItem}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC]">
        {!selectedItem ? (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center max-w-sm px-6">
              <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl mb-2">Encrypted Patient Chat</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Select a patient to securely communicate. Messages are end-to-end encrypted and comply with strict privacy standards.
              </p>
              <div className="inline-flex items-center gap-4 text-xs font-medium text-slate-400 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <span className="flex items-center gap-1.5"><Timer className="h-4 w-4 text-slate-400" /> 30-Day Limit</span>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-slate-400" /> AES-256-GCM</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base border border-blue-200 shadow-sm">
                  {`${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase() || 'P'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    {selectedItem.latestAppointment && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> 
                        {selectedItem.latestAppointment.type} 
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium ml-1">
                          {selectedItem.latestAppointment.status}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  connected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {connected ? 'CONNECTED' : 'DISCONNECTED'}
                </div>
                {selectedItem.daysRemaining != null && (
                  <div className={`text-xs font-medium flex items-center gap-1.5 ${selectedItem.daysRemaining <= 5 ? 'text-amber-600' : 'text-slate-500'}`}>
                    <Timer className="h-3.5 w-3.5" /> {selectedItem.daysRemaining} days access remaining
                  </div>
                )}
              </div>
            </div>

            {/* E2E banner */}
            <div className="bg-blue-50/50 border-b border-blue-100 px-6 py-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">
                End-to-End Encrypted. Messages are secured on your device before transmission.
              </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-sm font-medium">Decrypting history securely...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                  <div className="h-12 w-12 bg-white rounded-full shadow-sm flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-slate-400">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map(msg => <MessageBubble key={msg.id} msg={msg} user={user} />)}
                  
                  {isTyping && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white shadow-sm border border-slate-200 px-3 py-2 rounded-full w-fit ml-12">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                      <span className="ml-1">{selectedPatient.firstName} is typing...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-slate-200">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl flex items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm overflow-hidden">
                  <textarea 
                    rows={1} 
                    value={inputText} 
                    onChange={handleInputChange} 
                    onKeyDown={handleKeyDown}
                    placeholder="Type a secure message..."
                    disabled={!connected || !roomKey}
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 max-h-32 min-h-[48px]"
                  />
                </div>
                <button 
                  onClick={handleSend} 
                  disabled={!inputText.trim() || !connected || !roomKey || sending}
                  className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm hover:bg-blue-700 hover:shadow disabled:opacity-50 disabled:hover:bg-blue-600 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
                </button>
              </div>
              <div className="max-w-4xl mx-auto mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-400 pl-2">
                <Lock className="h-3 w-3" /> 
                Messages are protected by AES-256-GCM encryption
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes animate-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: animate-in 0.2s ease-out; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default DoctorChat;
