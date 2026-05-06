import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Heart, LogOut, User, ArrowLeft, Send, Search,
  Lock, Stethoscope, Wifi, WifiOff, ShieldCheck, Loader2,
  Timer, CalendarDays, MessageSquare, Check,
} from 'lucide-react';
import { portalChatService } from '../../api/chat.service';
import { deriveRoomKey, encryptMessage, decryptMessage } from '../../utils/chatCrypto';
import { logoutPortal } from '../../store/slices/portalAuthSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

/* ── Doctor Card ─────────────────────────────────────────────────────── */
const DoctorCard = ({ doctor, onSelect }) => (
  <button onClick={() => onSelect(doctor)}
    className="w-full flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-md transition-all text-left group">
    <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 border border-teal-100 group-hover:bg-teal-600 transition-colors">
      <Stethoscope className="h-5 w-5 text-teal-600 group-hover:text-white transition-colors" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-slate-900 text-base">Dr. {doctor.firstName} {doctor.lastName}</p>
      <p className="text-sm font-medium text-teal-700">{doctor.specialization}</p>
      {doctor.department && <p className="text-xs text-slate-500 mt-0.5">{doctor.department}</p>}
      
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" /> {doctor.appointmentType}
        </span>
        {doctor.daysRemaining != null && (
          <span className={`text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 ${
            doctor.daysRemaining <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <Timer className="h-3 w-3" /> {doctor.daysRemaining} days left
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
      <Lock className="h-3 w-3" /> SECURE
    </div>
  </button>
);

/* ── Message Bubble ──────────────────────────────────────────────────── */
const MessageBubble = ({ msg, isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-in`}>
    {!isOwn && (
      <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center mr-2 flex-shrink-0 mt-auto mb-5 border border-teal-200">
        <Stethoscope className="h-4 w-4 text-teal-700" />
      </div>
    )}
    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
      <div className={`px-4 py-2.5 text-[15px] shadow-sm ${
        isOwn
          ? 'bg-teal-600 text-white rounded-2xl rounded-br-sm'
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
      <div className={`flex items-center gap-1 text-[11px] mt-1.5 ${isOwn ? 'text-teal-600/70' : 'text-slate-400'}`}>
        {isOwn && <Lock className="h-2.5 w-2.5" />}
        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {isOwn && <Check className="h-3 w-3 ml-0.5" />}
      </div>
    </div>
  </div>
);

/* ── Main Component ──────────────────────────────────────────────────── */
const PatientChat = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { portalUser, token } = useSelector((s) => s.portalAuth);

  const [doctors, setDoctors] = useState([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
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

  useEffect(() => {
    portalChatService.getDoctors()
      .then(res => setDoctors(res?.data || []))
      .catch(() => {})
      .finally(() => setLoadingDoctors(false));
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => { setConnected(true); socket.emit('chat:join', { doctorId: selectedDoctor.id }); });
    socket.on('chat:joined', async (payload) => {
      const rKey = await deriveRoomKey(payload.roomId);
      setRoomKey(rKey);
    });
    socket.on('chat:message', async (msg) => {
      let plaintext = '(Unable to decrypt)';
      try {
        const key = await deriveRoomKey(`chat_${portalUser.patientId}_${selectedDoctor.id}`);
        plaintext = await decryptMessage(key, msg.ciphertext, msg.iv);
      } catch (_) {}
      setMessages(prev => [...prev, { ...msg, plaintext, decrypted: true }]);
    });
    socket.on('chat:typing', ({ senderType, isTyping: typing }) => { if (senderType === 'doctor') setIsTyping(typing); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:error', (e) => console.error('[Chat]', e.message));

    return () => { socket.disconnect(); setConnected(false); setRoomKey(null); setMessages([]); };
  }, [selectedDoctor, token]);

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
      }).catch(() => {}).finally(() => setLoadingHistory(false));
  }, [roomKey, selectedDoctor]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !socketRef.current || !roomKey || sending) return;
    setSending(true);
    try {
      const { ciphertext, iv } = await encryptMessage(roomKey, inputText.trim());
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
  const handleBack = () => { setSelectedDoctor(null); setMessages([]); setRoomKey(null); };

  const filteredDoctors = doctors.filter(d =>
    `${d.firstName} ${d.lastName} ${d.specialization} ${d.department}`.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-lg shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedDoctor && (
              <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="h-9 w-9 bg-teal-600 rounded-full flex items-center justify-center shadow-sm">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900">
                {selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'Health Portal'}
              </span>
              {selectedDoctor && <p className="text-xs font-medium text-teal-600">{selectedDoctor.specialization}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <User className="h-4 w-4 text-slate-400" />
              <span>{portalUser?.patientName || 'Patient'}</span>
            </div>
            <button onClick={() => { dispatch(logoutPortal()); navigate('/portal/login'); }}
              className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {!selectedDoctor ? (
          <div className="space-y-8 animate-in">
            {/* Hero */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                <ShieldCheck className="h-48 w-48 text-teal-600" />
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6">
                <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0 border border-teal-100">
                  <ShieldCheck className="h-8 w-8 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Secure Messages</h1>
                  <p className="mt-2 text-slate-500 leading-relaxed max-w-xl">
                    Communicate securely with your healthcare providers. All messages are protected with <strong>end-to-end encryption</strong>, ensuring your privacy is completely maintained.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <span className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-slate-400" /> AES-256-GCM Encrypted
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5 text-slate-400" /> 30-Day Expiration
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor list */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Your Care Team</h2>
                <span className="text-sm font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                  {filteredDoctors.length} available
                </span>
              </div>
              
              <div className="relative mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input type="text" placeholder="Search by doctor name or specialty..." value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all"
                />
              </div>

              {loadingDoctors ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-16 px-4 border border-slate-200 border-dashed rounded-2xl bg-white/50">
                  <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-lg mb-1">No doctors available</h3>
                  <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                    You can only message doctors with whom you've had an appointment in the last 30 days.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDoctors.map(d => <DoctorCard key={d.id} doctor={d} onSelect={setSelectedDoctor} />)}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Chat View */
          <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">END-TO-END ENCRYPTED</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  connected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {connected ? 'CONNECTED' : 'OFFLINE'}
                </div>
                {selectedDoctor.daysRemaining != null && (
                  <div className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                    selectedDoctor.daysRemaining <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Timer className="h-3.5 w-3.5" /> {selectedDoctor.daysRemaining} days left
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-[#F8FAFC]">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                  <p className="text-sm font-medium">Decrypting your messages securely...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                  <div className="h-16 w-16 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-teal-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-900 mb-1">Secure Channel Ready</p>
                    <p className="text-sm text-slate-500">Send your first secure message to Dr. {selectedDoctor.lastName}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map(msg => <MessageBubble key={msg.id} msg={msg} isOwn={msg.senderType === 'patient'} />)}
                  
                  {isTyping && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white shadow-sm border border-slate-200 px-3 py-2 rounded-full w-fit ml-12">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                      <span className="ml-1">Dr. {selectedDoctor.lastName} is typing...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              )}
            </div>

            <div className="bg-white p-4 border-t border-slate-200">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl flex items-center focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 focus-within:bg-white transition-all shadow-sm overflow-hidden">
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
                  className="h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm hover:bg-teal-700 hover:shadow disabled:opacity-50 disabled:hover:bg-teal-600 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
                </button>
              </div>
              <div className="max-w-4xl mx-auto mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-400 pl-2">
                <Lock className="h-3 w-3" /> 
                HealthCareEHR cannot read your messages
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes animate-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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

export default PatientChat;
