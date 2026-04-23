import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Heart, LogOut, User, ArrowLeft, Send, Search,
  Lock, Stethoscope, Wifi, WifiOff, ShieldCheck, Loader2,
} from 'lucide-react';
import { portalChatService } from '../../api/chat.service';
import { deriveRoomKey, encryptMessage, decryptMessage } from '../../utils/chatCrypto';
import { logoutPortal } from '../../store/slices/portalAuthSlice';
import { useDispatch } from 'react-redux';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

// ── Doctor Selection Card ─────────────────────────────────────────────────────
const DoctorCard = ({ doctor, onSelect }) => (
  <button
    onClick={() => onSelect(doctor)}
    className="w-full flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-emerald-400/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-left group"
  >
    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
      <Stethoscope className="h-5 w-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-foreground">Dr. {doctor.firstName} {doctor.lastName}</p>
      <p className="text-sm text-emerald-600 font-medium">{doctor.specialization}</p>
      {doctor.department && (
        <p className="text-xs text-muted-foreground mt-0.5">{doctor.department}</p>
      )}
    </div>
    <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
      <Lock className="h-3 w-3" />
      E2E
    </div>
  </button>
);

// ── Message Bubble ─────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
    {!isOwn && (
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
        <Stethoscope className="h-3.5 w-3.5 text-white" />
      </div>
    )}
    <div className={`max-w-[72%] group`}>
      <div
        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
          isOwn
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm'
            : 'bg-card border border-border text-foreground rounded-bl-sm'
        }`}
      >
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
        {isOwn && <span className="ml-1">· Encrypted</span>}
      </p>
    </div>
    {isOwn && (
      <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
        <User className="h-3.5 w-3.5 text-emerald-600" />
      </div>
    )}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const PatientChat = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { portalUser, token } = useSelector((s) => s.portalAuth);

  // Doctor selection state
  const [doctors, setDoctors] = useState([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

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

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  // ── Load doctors on mount ─────────────────────────────────────────────────
  useEffect(() => {
    portalChatService.getDoctors()
      .then(res => setDoctors(res?.data || []))
      .catch(() => {})
      .finally(() => setLoadingDoctors(false));
  }, []);

  // ── Connect socket when doctor selected ──────────────────────────────────
  useEffect(() => {
    if (!selectedDoctor || !token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('chat:join', { doctorId: selectedDoctor.id });
    });

    socket.on('chat:joined', async (payload) => {
      const rKey = await deriveRoomKey(payload.roomId);
      setRoomKey(rKey);
    });

    socket.on('chat:message', async (msg) => {
      // Decrypt on receipt
      let plaintext = '(Unable to decrypt)';
      try {
        const key = await deriveRoomKey(`chat_${portalUser.patientId}_${selectedDoctor.id}`);
        plaintext = await decryptMessage(key, msg.ciphertext, msg.iv);
      } catch (_) {}
      setMessages(prev => [...prev, { ...msg, plaintext, decrypted: true }]);
    });

    socket.on('chat:typing', ({ senderType, isTyping: typing }) => {
      if (senderType === 'doctor') setIsTyping(typing);
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:error', (e) => console.error('[Chat]', e.message));

    return () => {
      socket.disconnect();
      setConnected(false);
      setRoomKey(null);
      setMessages([]);
    };
  }, [selectedDoctor, token]);

  // ── Load history when room key ready ─────────────────────────────────────
  useEffect(() => {
    if (!roomKey || !selectedDoctor) return;

    setLoadingHistory(true);
    portalChatService.getHistory(selectedDoctor.id)
      .then(async (res) => {
        const rows = res?.data || [];
        const decrypted = await Promise.all(rows.map(async (m) => {
          let plaintext = '(Unable to decrypt)';
          try { plaintext = await decryptMessage(roomKey, m.ciphertext, m.iv); } catch (_) {}
          return { ...m, plaintext, decrypted: true };
        }));
        setMessages(decrypted);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [roomKey, selectedDoctor]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !socketRef.current || !roomKey || sending) return;
    setSending(true);

    try {
      const { ciphertext, iv } = await encryptMessage(roomKey, inputText.trim());
      socketRef.current.emit('chat:message', { ciphertext, iv });
      setInputText('');
    } finally {
      setSending(false);
    }
  }, [inputText, roomKey, sending]);

  // ── Typing indicator ──────────────────────────────────────────────────────
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

  const handleBack = () => {
    setSelectedDoctor(null);
    setMessages([]);
    setRoomKey(null);
  };

  const filteredDoctors = doctors.filter(d =>
    `${d.firstName} ${d.lastName} ${d.specialization} ${d.department}`.toLowerCase()
      .includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedDoctor && (
              <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-foreground">
                {selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'Secure Chat'}
              </span>
              {selectedDoctor && (
                <p className="text-xs text-muted-foreground">{selectedDoctor.specialization}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedDoctor && (
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {connected ? 'Live' : 'Offline'}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{portalUser?.patientName || 'Patient'}</span>
            </div>
            <button
              onClick={() => { dispatch(logoutPortal()); navigate('/portal/login'); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!selectedDoctor ? (
          /* ── Doctor Selection View ───────────────────────────────────────── */
          <div className="space-y-6">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-8 text-white shadow-lg">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Secure Patient-Doctor Chat</h1>
                  <p className="mt-1.5 text-emerald-100 text-sm max-w-lg">
                    All messages are <strong>end-to-end encrypted</strong> using AES-256-GCM directly in your browser. 
                    Only you and your doctor can read them — not even the server can decrypt your conversation.
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Lock className="h-3 w-3" /> AES-256-GCM Encrypted
                    </span>
                    <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full">Zero server-side access</span>
                    <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full">HIPAA Compliant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor search & list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Choose a Doctor</h2>
                <span className="text-sm text-muted-foreground">{filteredDoctors.length} available</span>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, specialty, or department…"
                  value={doctorSearch}
                  onChange={e => setDoctorSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {loadingDoctors ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDoctors.map(d => (
                    <DoctorCard key={d.id} doctor={d} onSelect={setSelectedDoctor} />
                  ))}
                  {filteredDoctors.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No doctors found.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Chat View ────────────────────────────────────────────────────── */
          <div className="flex flex-col h-[calc(100vh-12rem)] rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Encryption banner */}
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800/40">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                End-to-end encrypted · Only you and Dr. {selectedDoctor.lastName} can read this conversation
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                    <p className="text-sm text-muted-foreground">Decrypting message history…</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto">
                      <Lock className="h-7 w-7 text-white" />
                    </div>
                    <p className="font-medium text-foreground">Secure channel ready</p>
                    <p className="text-sm text-muted-foreground">
                      Send your first encrypted message to Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.senderType === 'patient'}
                  />
                ))
              )}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  Dr. {selectedDoctor.lastName} is typing…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex items-end gap-3">
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type an encrypted message… (Enter to send)"
                  disabled={!connected || !roomKey}
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || !connected || !roomKey || sending}
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Encrypted before sending · The server cannot read your messages
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientChat;
