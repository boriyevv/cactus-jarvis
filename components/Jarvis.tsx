'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, refreshAll, toast } from '@/lib/client';

type Msg = { role: 'user' | 'assistant'; content: string; actions?: any[] };

const WAKE = /(jarvis|jarviz|jervis|джарвис|джарвіс|жарвис|жарвіс|жервис|ярвис|харвис|гарвис|jarwis|jarviss)/i;
const GREETING: Msg = {
  role: 'assistant',
  content: 'Я Jarvis. Включите микрофон и скажите «Jarvis, …» или напишите команду. Например: «Jarvis, как идут дела?» или «Jarvis, добавь сотрудника Асадбек, профессия программист».',
};

const Ctx = createContext<any>(null);
export const useJarvis = () => useContext(Ctx);

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [awake, setAwake] = useState(false);
  const [voiceOut, setVoiceOut] = useState(true);
  const [lang, setLang] = useState('ru-RU');
  const [supported, setSupported] = useState(true);

  const msgsRef = useRef<Msg[]>([GREETING]);
  const busyRef = useRef(false);
  const recRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const awakeUntil = useRef(0);
  const langRef = useRef('ru-RU');
  const voiceRef = useRef(true);

  useEffect(() => {
    try {
      const l = localStorage.getItem('cj_lang'); if (l) { setLang(l); langRef.current = l; }
      const v = localStorage.getItem('cj_voice_out'); if (v === '0') { setVoiceOut(false); voiceRef.current = false; }
    } catch {}
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    return () => { listeningRef.current = false; try { recRef.current?.abort(); } catch {} window.speechSynthesis?.cancel(); };
  }, []);

  const push = (m: Msg) => { msgsRef.current = [...msgsRef.current, m]; setMessages(msgsRef.current); };

  const beep = () => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const c = new AC(); const o = c.createOscillator(); const g = c.createGain();
      o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(c.destination); o.start();
      setTimeout(() => { o.stop(); c.close(); }, 140);
    } catch {}
  };

  const startRec = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || recRef.current || !listeningRef.current) return;
    const r = new SR();
    r.lang = langRef.current; r.continuous = true; r.interimResults = false;
    r.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) heardRef.current(String(e.results[i][0].transcript || '').trim());
      }
    };
    r.onend = () => { recRef.current = null; if (listeningRef.current && !speakingRef.current) setTimeout(startRec, 250); };
    r.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        listeningRef.current = false; setListening(false);
        toast('Доступ к микрофону запрещён браузером', 'err');
      }
    };
    recRef.current = r;
    try { r.start(); } catch { recRef.current = null; }
    // eslint-disable-next-line
  }, []);

  const stopRec = () => { try { recRef.current?.abort(); } catch {} recRef.current = null; };

  const speak = useCallback((text: string) => {
    if (!voiceRef.current || typeof window === 'undefined' || !window.speechSynthesis) return;
    const clean = text.split('\n').filter((l) => !l.includes('🔑')).join('. ').replace(/[*_`#>|]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    const want = langRef.current;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === want) || voices.find((x) => x.lang.startsWith(want.slice(0, 2))) || voices.find((x) => x.lang.startsWith('ru'));
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = want;
    u.onstart = () => { speakingRef.current = true; stopRec(); };
    const done = () => { speakingRef.current = false; if (listeningRef.current) setTimeout(startRec, 200); };
    u.onend = done; u.onerror = done;
    window.speechSynthesis.speak(u);
  }, [startRec]);

  const stopSpeaking = () => { window.speechSynthesis?.cancel(); speakingRef.current = false; if (listeningRef.current) setTimeout(startRec, 200); };

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || busyRef.current) return;
    setOpen(true);
    push({ role: 'user', content: t });
    busyRef.current = true; setBusy(true);
    try {
      const history = msgsRef.current.map((m) => ({ role: m.role, content: m.content }));
      const r = await api('/api/jarvis', 'POST', { messages: history });
      push({ role: 'assistant', content: r.reply, actions: r.actions });
      if ((r.actions || []).some((a: any) => a.ok)) refreshAll();
      speak(r.reply);
    } catch (e: any) {
      push({ role: 'assistant', content: '⚠ ' + e.message });
      speak('Произошла ошибка. ' + e.message);
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }, [speak]);

  const heard = (text: string) => {
    if (!text) return;
    const m = text.match(WAKE);
    if (m && m.index !== undefined) {
      const after = text.slice(m.index + m[0].length).replace(/^[\s,.:;!?\-—]+/, '').trim();
      setOpen(true);
      if (after.length > 1) { awakeUntil.current = 0; setAwake(false); send(after); }
      else { awakeUntil.current = Date.now() + 10000; setAwake(true); beep(); setTimeout(() => setAwake(Date.now() < awakeUntil.current), 10100); }
      return;
    }
    if (Date.now() < awakeUntil.current) { awakeUntil.current = 0; setAwake(false); send(text); }
  };
  const heardRef = useRef(heard); heardRef.current = heard;

  const toggleListening = () => {
    if (listeningRef.current) {
      listeningRef.current = false; setListening(false); setAwake(false); stopRec(); return;
    }
    if (!supported) { toast('Голосовой ввод работает в Chrome / Edge / Safari. Пишите команды текстом.', 'warn'); return; }
    listeningRef.current = true; setListening(true); setOpen(true);
    startRec();
    toast('Слушаю. Скажите «Jarvis…»');
  };

  const setLanguage = (l: string) => {
    setLang(l); langRef.current = l; try { localStorage.setItem('cj_lang', l); } catch {}
    if (listeningRef.current) { stopRec(); setTimeout(startRec, 250); }
  };
  const toggleVoiceOut = () => {
    const v = !voiceRef.current; voiceRef.current = v; setVoiceOut(v);
    try { localStorage.setItem('cj_voice_out', v ? '1' : '0'); } catch {}
    if (!v) window.speechSynthesis?.cancel();
  };
  const reset = () => { msgsRef.current = [GREETING]; setMessages([GREETING]); };

  return (
    <Ctx.Provider value={{ messages, busy, open, setOpen, listening, awake, voiceOut, lang, supported, send, speak, stopSpeaking, toggleListening, setLanguage, toggleVoiceOut, reset }}>
      {children}
    </Ctx.Provider>
  );
}

const EXAMPLES = [
  'Как идут дела?',
  'Сколько процентов выполнил первый сотрудник?',
  'Кто опаздывает? Предупреди их',
  'Добавь сотрудника Асадбек, профессия программист',
];

export function JarvisChat({ page }: { page?: boolean }) {
  const j = useJarvis();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [j.messages, j.busy]);
  const submit = (e: any) => { e.preventDefault(); if (!text.trim()) return; j.send(text); setText(''); };
  return (
    <div className={page ? 'jv-page' : 'jv-inner'} style={page ? undefined : { display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="jv-head">
        <div>
          <b>JARVIS</b>
          <small>{j.awake ? 'Слушаю команду…' : j.listening ? 'Ждёт слово «Jarvis»' : 'Микрофон выключен'}</small>
        </div>
        <div className="row">
          <button className="btn small secondary" onClick={j.reset}>Очистить</button>
          {!page && <button className="close" onClick={() => j.setOpen(false)} aria-label="Свернуть">✕</button>}
        </div>
      </div>
      <div className="jv-body">
        {j.messages.map((m: Msg, i: number) => (
          <div key={i} className={'msg ' + m.role}>
            {m.content}
            {m.actions && m.actions.length > 0 && (
              <div className="acts">
                {m.actions.map((a, k) => (
                  <span key={k} className={'act' + (a.ok ? '' : ' bad')} title={a.error || ''}>{a.ok ? '✓' : '✕'} {a.tool}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {j.busy && <div className="msg assistant muted">Jarvis думает…</div>}
        <div ref={endRef} />
      </div>
      {j.messages.length <= 1 && (
        <div className="chips">
          {EXAMPLES.map((e) => <button key={e} className="chip" onClick={() => j.send(e)}>{e}</button>)}
        </div>
      )}
      <div className="jv-tools">
        <button className={'btn small secondary mic' + (j.listening ? ' on' : '')} onClick={j.toggleListening}>
          {j.listening ? '🎙 Слушаю «Jarvis»' : '🎙 Включить голос'}
        </button>
        <button className="btn small secondary" onClick={j.toggleVoiceOut}>{j.voiceOut ? '🔊 Озвучка вкл' : '🔇 Озвучка выкл'}</button>
        <button className="btn small ghost" onClick={j.stopSpeaking}>⏹</button>
        <select value={j.lang} onChange={(e) => j.setLanguage(e.target.value)} aria-label="Язык голоса">
          <option value="ru-RU">Русский</option>
          <option value="uz-UZ">O‘zbek</option>
          <option value="en-US">English</option>
        </select>
      </div>
      <form className="jv-input" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Напишите команду Jarvis…" disabled={j.busy} />
        <button className="btn primary" disabled={j.busy || !text.trim()}>➤</button>
      </form>
    </div>
  );
}

export function JarvisDock() {
  const j = useJarvis();
  return (
    <>
      {j.open && <div className="jv-panel"><JarvisChat /></div>}
      <button
        className={'jv-fab' + (j.listening ? ' live' : '') + (j.awake ? ' awake' : '')}
        onClick={() => j.setOpen(!j.open)}
        aria-label="Открыть Jarvis"
        title="Jarvis"
      >
        ✦
      </button>
    </>
  );
}
