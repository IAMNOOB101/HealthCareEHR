import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  Users, Send, Search, Lock, MessageSquare,
  Wifi, WifiOff, Loader2, User, ArrowLeft,
  ShieldCheck, Activity,
} from 'lucide-react';
import { staffChatService } from '../api/chat.service';
import { deriveRoomKey, encryptMessage, decryptMessage } from '../utils/chatCrypto';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

// ── Patient list item ─────────────────────────────────────────────────────────
const PatientItem = ({ item, isSelected, onClick, hasConversation }) => {
  const patient = item.Patient || {};
  const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();

  return (
    <button
      onClick={() => onClick(item)}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted border border-transparent'
      }`}
    >
      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
        isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {initials || 'P'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {patient.firstName} {patient.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{item.email || item.PortalUser?.email}</p>
      </div>
      {hasConversation && (
        <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
      )}
    </button>
  );
};

// ── Message bubble ─────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, user }) => {
  const isOwn = msg.senderType === 'doctor';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isOwn && (
        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <User className="h-3.5 w-3.5 text-blue-600" />
        </div>
      )}
      <div className="max-w-[72%]">
        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
          isOwn
            ? 'bg-gradient-to-br from-primary to-primary/80 text-white rounded-br-sm'
            : 'bg-card border border-border text-foreground rounded-bl-sm'
        }`}>
          {msg.decrypted ? (
            <span>{msg.plaintext}</span>
          ) : (
            <span className="flex items-center gap-1 text-xs opacity-70 italic">
              <Lock className="h-3 w-3" /> Decrypting…
            </span>
          )}
        </div>
        <p className={`text-[10px] mt-1 text-muted-foreground ${isOwn ? 'text-right' : 'text-left'}`}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isOwn && <span className="ml-1">· Sent</span>}
        </p>
      </div>
      {isOwn && (
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center ml-2 flex-shrink-0 mt-1 text-primary text-xs font-bold">
          {user?.username?.slice(0, 2).toUpperCase() || 'DR'}
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const DoctorChat = () => {
  const { user, token } = useSelector((s) => s.auth);

  // Patient selection
  const [allPatients, setAllPatients] = useState([]);
  const [existingPatients, setExistingPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' | 'all'
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Chat state
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load patients ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingPatients(true);
    Promise.all([
      staffChatService.getPatients(),
      staffChatService.getAllPatients(),
    ]).then(([existRes, allRes]) => {
      const existData = existRes?.data || [];
      const allData = allRes?.data || [];
      setExistingPatients(existData);
      setAllPatients(allData);
      // Get doctorId from either response
      if (existRes?.doctorId) setDoctorId(existRes.doctorId);
      else if (allRes?.doctorId) setDoctorId(allRes.doctorId);
    }).catch(console.error)
      .finally(() => setLoadingPatients(false));
  }, []);

  // ── Connect socket when patient selected ─────────────────────────────────
  useEffect(() => {
    if (!selectedItem || !token || !doctorId) return;

    const portalUserId = selectedItem.id || selectedItem.portalUserId;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('chat:join', { portalUserId });
    });

    socket.on('chat:joined', async (payload) => {
      const roomId = payload.roomId || `chat_${payload.patientId}_${doctorId}`;
      const rKey = await deriveRoomKey(roomId);
      setRoomKey({ key: rKey, roomId, patientId: payload.patientId, portalUserId });
    });

    socket.on('chat:message', async (msg) => {
      let plaintext = '(Unable to decrypt)';
      try {
        const rmKey = await deriveRoomKey(`chat_${selectedItem.patientId || selectedItem.Patient?.id}_${doctorId}`);
        plaintext = await decryptMessage(rmKey, msg.ciphertext, msg.iv);
      } catch (_) {}
      setMessages(prev => [...prev, { ...msg, plaintext, decrypted: true }]);
    });

    socket.on('chat:typing', ({ senderType, isTyping: typing }) => {
      if (senderType === 'patient') setIsTyping(typing);
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:error', (e) => console.error('[Chat]', e.message));

    return () => {
      socket.disconnect();
      setConnected(false);
      setRoomKey(null);
      setMessages([]);
    };
  }, [selectedItem, token, doctorId]);

  // ── Load history ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomKey || !selectedItem) return;

    setLoadingHistory(true);
    const portalUserId = selectedItem.id || selectedItem.portalUserId;

    staffChatService.getHistory(portalUserId)
      .then(async (res) => {
        const rows = res?.data || [];
        const decrypted = await Promise.all(rows.map(async (m) => {
          let plaintext = '(Unable to decrypt)';
          try { plaintext = await decryptMessage(roomKey.key, m.ciphertext, m.iv); } catch (_) {}
          return { ...m, plaintext, decrypted: true };
        }));
        setMessages(decrypted);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [roomKey, selectedItem]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !socketRef.current || !roomKey || sending) return;
    setSending(true);
    try {
      const { ciphertext, iv } = await encryptMessage(roomKey.key, inputText.trim());
      socketRef.current.emit('chat:message', { ciphertext, iv });
      setInputText('');
    } finally {
      setSending(false);
    }
  }, [inputText, roomKey, sending]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socketRef.current) return;
    socketRef.current.emit('chat:typing', { isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing', { isTyping: false });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const displayList = (activeTab === 'existing' ? existingPatients : allPatients)
    .filter(item => {
      const p = item.Patient || {};
      const q = search.toLowerCase();
      return `${p.firstName} ${p.lastName} ${item.email || ''} ${item.PortalUser?.email || ''}`.toLowerCase().includes(q);
    });

  const selectedPatient = selectedItem?.Patient || {};

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Secure Chat</h2>
            <div className="ml-auto flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              <Lock className="h-2.5 w-2.5" />
              E2E
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden mb-3">
            {[
              { id: 'existing', label: 'Conversations', count: existingPatients.length },
              { id: 'all', label: 'All Patients', count: allPatients.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingPatients ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : displayList.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No patients found.</p>
          ) : (
            displayList.map(item => (
              <PatientItem
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onClick={setSelectedItem}
                hasConversation={activeTab === 'existing'}
              />
            ))
          )}
        </div>

        {/* Security notice */}
        <div className="p-3 border-t border-border">
          <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              Messages are AES-256-GCM encrypted. Only you and the patient can read them.
            </p>
          </div>
        </div>
      </div>

      {/* ── Chat Area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedItem ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Select a Patient</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose from your conversations or start a new one
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                All conversations are end-to-end encrypted
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                {`${selectedPatient.firstName?.[0] || ''}${selectedPatient.lastName?.[0] || ''}`.toUpperCase() || 'P'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-xs text-muted-foreground">{selectedItem.email || selectedItem.PortalUser?.email}</p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {connected ? 'Live' : 'Offline'}
              </div>
            </div>

            {/* Encryption banner */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800/40">
              <Lock className="h-3 w-3 text-emerald-600" />
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                End-to-end encrypted · No one else can read this conversation
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-1 bg-background">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Decrypting messages…</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Lock className="h-7 w-7 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">Encrypted channel ready</p>
                    <p className="text-sm text-muted-foreground">
                      Send an encrypted message to {selectedPatient.firstName}
                    </p>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} user={user} />
                ))
              )}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  {selectedPatient.firstName} is typing…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4 bg-card">
              <div className="flex items-end gap-3">
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type an encrypted message… (Enter to send)"
                  disabled={!connected || !roomKey}
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 max-h-32"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || !connected || !roomKey || sending}
                  className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Encrypted with AES-256-GCM before transmission
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorChat;
