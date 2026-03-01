'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import ChatRenderer from '@/components/ChatRenderer';
import { ParsedChat } from '@/types';

function detectAndParse(raw: string, filename?: string): ParsedChat {
  if (filename?.endsWith('.json') || raw.trim().startsWith('{')) {
    try {
      const j = JSON.parse(raw);
      const m = j.metadata || {}; const dates = m.dates || {};
      return { title: m.title || '对话', created: dates.exported || '', link: m.link || '', source: 'gemini',
        turns: (j.messages || []).map((msg: any) => ({ role: msg.role === 'Prompt' ? 'user' as const : 'assistant' as const, ts: '', content: (msg.say || '').replace(/^Gemini 说\s*/, '').trim() })) };
    } catch {}
  }
  if (/^\*\*You:\*\*/.test(raw.trim()) || /^\*\*ChatGPT:\*\*/.test(raw.trim())) {
    const turns: ParsedChat['turns'] = [];
    raw.split(/(?=\*\*(?:You|ChatGPT):\*\*)/).forEach(block => {
      const u = block.match(/^\*\*You:\*\*\s*([\s\S]*)/);
      const g = block.match(/^\*\*ChatGPT:\*\*\s*([\s\S]*)/);
      if (u) turns.push({ role: 'user', ts: '', content: u[1].replace(/^[\s\n]*---[\s\n]*/, '').trim() });
      else if (g) turns.push({ role: 'assistant', ts: '', content: g[1].replace(/[\s\n]*---\s*$/, '').trim() });
    });
    return { title: turns[0]?.content?.slice(0, 40) || '对话', created: '', link: '', source: 'chatgpt', turns };
  }
  if (/^## Prompt:/m.test(raw)) {
    const titleM = raw.match(/^#\s+(.+)$/m); const createdM = raw.match(/\*\*Created:\*\*\s+(.+)/);
    const linkM = raw.match(/\*\*Link:\*\*\s+\[.+?\]\((.+?)\)/); const link = linkM ? linkM[1] : '';
    let source: ParsedChat['source'] = link.includes('gemini.google.com') ? 'gemini' : 'claude';
    const turns: ParsedChat['turns'] = []; const parts = raw.split(/^## (Prompt|Response):/m);
    let i = 1;
    while (i < parts.length) {
      const type = parts[i]; const content = (parts[i+1]||'').trim(); const lines = content.split('\n');
      const tsM = lines[0]?.match(/^\d{4}\/\d+\/\d+\s+\d+:\d+:\d+/); const ts = tsM ? tsM[0] : '';
      if (type === 'Prompt') {
        let file: string|null = null; const body: string[] = []; let si = tsM ? 1 : (lines[0]?.trim()===''?1:0);
        for (let j=si;j<lines.length;j++){const l=lines[j];const fm=l.match(/^>\s*File:\s*(.+)/);if(fm){file=fm[1].trim();continue;}if(l.startsWith('> '))body.push(l.slice(2));else if(l==='>')body.push('');else body.push(l);}
        turns.push({role:'user',ts,content:body.join('\n').trim(),file});
      } else {
        let si = tsM ? 1 : (lines[0]?.trim()===''?1:0);
        turns.push({role:'assistant',ts,content:lines.slice(si).join('\n').trim().replace(/\n+---\s*\nPowered by.*/s,'').replace(/^Gemini 说\s*\n-{2,}\s*\n?/,'').trim()});
      }
      i+=2;
    }
    return { title: titleM?titleM[1].trim():'对话', created: createdM?createdM[1].trim():'', link, source, turns };
  }
  return { title:'对话', created:'', link:'', source:'unknown', turns:[{role:'assistant',ts:'',content:raw}] };
}

export default function HomePage() {
  const { user, login, register } = useAuth();
  const { show: toast } = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [chatData, setChatData] = useState<ParsedChat|null>(null);
  const [rawMd, setRawMd] = useState('');
  const [viewing, setViewing] = useState(false);
  // Share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [publishToPlaza, setPublishToPlaza] = useState(false);
  const [shareDesc, setShareDesc] = useState('');
  const [sharePasscode, setSharePasscode] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  // Login-in-modal (feature #7)
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login'|'register'>('login');
  const [lmEmail, setLmEmail] = useState('');
  const [lmPassword, setLmPassword] = useState('');
  const [lmNickname, setLmNickname] = useState('');
  const [lmError, setLmError] = useState('');
  const [lmLoading, setLmLoading] = useState(false);
  // Drag
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { const t = e.target?.result as string; setRawMd(t); setChatData(detectAndParse(t, file.name)); setViewing(true); };
    reader.readAsText(file);
  }, []);

  // Global drag
  useEffect(() => {
    const enter = (e: DragEvent) => { e.preventDefault(); dragCounter.current++; if(e.dataTransfer?.types.includes('Files')) setDragging(true); };
    const leave = (e: DragEvent) => { e.preventDefault(); dragCounter.current--; if(dragCounter.current<=0){setDragging(false);dragCounter.current=0;} };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => { e.preventDefault(); setDragging(false); dragCounter.current=0;
      const f = e.dataTransfer?.files[0];
      if(f&&/\.(md|markdown|txt|json)$/i.test(f.name)) handleFile(f); else if(f) toast('请上传 .md、.json 或 .txt 文件');
    };
    document.addEventListener('dragenter',enter); document.addEventListener('dragleave',leave);
    document.addEventListener('dragover',over); document.addEventListener('drop',drop);
    return()=>{document.removeEventListener('dragenter',enter);document.removeEventListener('dragleave',leave);document.removeEventListener('dragover',over);document.removeEventListener('drop',drop);};
  }, [handleFile, toast]);

  // ESC to close viewer (#6)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && viewing && !shareOpen && !loginModalOpen) setViewing(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewing, shareOpen, loginModalOpen]);

  // Handle share button click (#7)
  const handleShareClick = () => {
    if (!user) { setLoginModalOpen(true); return; }
    setShareOpen(true);
  };

  // Login in modal (#7)
  const handleLoginInModal = async () => {
    setLmError(''); setLmLoading(true);
    if (loginMode === 'login') {
      const res = await login(lmEmail, lmPassword);
      if (res.error) { setLmError(res.error); setLmLoading(false); return; }
    } else {
      const res = await register(lmNickname, lmEmail, lmPassword);
      if (res.error) { setLmError(res.error); setLmLoading(false); return; }
    }
    setLmLoading(false); setLoginModalOpen(false);
    setLmEmail(''); setLmPassword(''); setLmNickname(''); setLmError('');
    toast('登录成功'); setShareOpen(true);
  };

  // Try to inline Google images as data URIs before uploading.
  // Due to CORS restrictions, this only works for public Google images.
  // Auth-required images (most Gemini /gg/ paths) will fall through to
  // the server-side proxy, which shows a friendly placeholder if it also fails.
  const inlineGoogleImages = async (md: string): Promise<string> => {
    const urlRegex = /https?:\/\/lh[0-9]*\.googleusercontent\.com\/[^\s<>")\]]+/g;
    const urls = [...new Set(md.match(urlRegex) || [])];
    if (urls.length === 0) return md;

    const replacements = new Map<string, string>();

    await Promise.all(urls.map(async (url) => {
      try {
        // Try fetching without credentials (works for public images)
        const resp = await fetch(url);
        if (!resp.ok) return;
        const blob = await resp.blob();
        if (!blob.type.startsWith('image/') || blob.size > 5 * 1024 * 1024) return;
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        if (dataUrl && dataUrl.length > 100) {
          replacements.set(url, dataUrl);
        }
      } catch { /* skip */ }
    }));

    if (replacements.size > 0) {
      let result = md;
      for (const [original, dataUrl] of replacements) {
        result = result.split(original).join(dataUrl);
      }
      return result;
    }
    return md;
  };

  const confirmShare = async () => {
    setSharing(true);
    try {
      // Inline Google images before uploading so they don't break when shared
      let mdToUpload = rawMd;
      if (chatData?.source === 'gemini' && /lh[0-9]*\.googleusercontent\.com/.test(rawMd)) {
        try {
          mdToUpload = await inlineGoogleImages(rawMd);
        } catch { /* proceed with original if inlining fails */ }
      }

      const res = await fetch('/api/chats/share', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ markdown:mdToUpload, title:chatData?.title||'对话', source:chatData?.source||'unknown', description:shareDesc, publishToPlaza, passcode:sharePasscode||'' }) });
      const d = await res.json();
      if(!res.ok){ toast(d.error||'分享失败'); setSharing(false); return; }
      const url = `${location.origin}/c/${d.chat.id}`;
      setShareUrl(url);
      try{ await navigator.clipboard.writeText(url); }catch{}
    } catch { toast('网络错误'); }
    setSharing(false);
  };

  // =================== VIEWER ===================
  if (viewing && chatData) {
    return (
      <div className="min-h-dvh bg-white">
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-surface-200/60">
          <div className="max-w-[780px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Close icon instead of back arrow (#6) */}
              <button onClick={()=>setViewing(false)} title="关闭 (Esc)" className="flex-shrink-0 w-8 h-8 rounded-lg border border-surface-200 hover:border-brand-400 flex items-center justify-center text-surface-500 hover:text-brand-500 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <div className="min-w-0">
                <h2 className="font-serif font-semibold text-[0.92rem] truncate">{chatData.title}</h2>
                {chatData.created && <p className="text-[0.68rem] text-surface-400 truncate">{chatData.created}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={()=>{if(!rawMd)return;const b=new Blob([rawMd],{type:'text/markdown'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=(chatData?.title||'chat')+'.md';a.click();URL.revokeObjectURL(u);toast('已导出');}} className="px-2.5 py-1.5 rounded-lg border border-surface-200 text-surface-500 hover:border-brand-400 hover:text-brand-500 text-xs font-medium transition-colors">导出</button>
              <button onClick={handleShareClick} className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shadow-sm">分享</button>
            </div>
          </div>
        </div>

        {/* Local-only tip (#6) */}
        <div className="bg-amber-50 border-b border-amber-200/60 text-center py-2 px-4">
          <p className="text-xs text-amber-700">
            <svg className="w-3.5 h-3.5 inline -mt-0.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            当前为本地预览，数据未保存到服务器。要保存到账号并获取分享链接，请点击
            <button onClick={handleShareClick} className="text-brand-600 font-semibold underline underline-offset-2 ml-0.5">「分享」</button>
          </p>
        </div>

        <ChatRenderer data={chatData}/>

        {/* Share modal with description & passcode (#1) */}
        <Modal open={shareOpen} onClose={()=>{setShareOpen(false);setShareUrl('');setPublishToPlaza(false);setShareDesc('');setSharePasscode('');}}>
          {!shareUrl?(
            <div className="p-6">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center mx-auto mb-3 shadow-md">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                </div>
                <h3 className="font-serif font-semibold text-lg">分享对话</h3>
                <p className="text-sm text-surface-500 mt-1">保存并生成可分享的链接</p>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">描述（可选）</label>
                  <textarea value={shareDesc} onChange={e=>setShareDesc(e.target.value)} placeholder="简要描述这段对话的内容..." className="w-full px-3 py-2 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm resize-none h-16" maxLength={200}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">口令保护（可选）</label>
                  <input value={sharePasscode} onChange={e=>setSharePasscode(e.target.value.replace(/[^a-zA-Z0-9]/g,'').slice(0,4))} placeholder="4位字母或数字" maxLength={4} className="w-full px-3 py-2 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm font-mono tracking-widest"/>
                  <p className="text-[0.68rem] text-surface-400 mt-1">设置后，查看者需要输入口令才能查看</p>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-brand-300 cursor-pointer transition-colors mb-4">
                <input type="checkbox" checked={publishToPlaza} onChange={e=>setPublishToPlaza(e.target.checked)} className="w-4 h-4 accent-brand-500"/>
                <div><p className="text-sm font-medium">发布到广场</p><p className="text-xs text-surface-400 mt-0.5">审核通过后出现在公共广场</p></div>
              </label>
              <div className="flex gap-3">
                <button onClick={()=>{setShareOpen(false);setPublishToPlaza(false);setShareDesc('');setSharePasscode('');}} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-surface-600 text-sm font-semibold hover:bg-surface-50">取消</button>
                <button onClick={confirmShare} disabled={sharing} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 shadow-sm">{sharing?'保存中...':'确认分享'}</button>
              </div>
            </div>
          ):(
            <div className="p-6 text-center">
              <p className="text-brand-500 font-semibold text-sm mb-1">✓ 分享成功</p>
              {publishToPlaza && <p className="text-xs text-surface-400 mb-3">广场发布申请已提交，等待审核</p>}
              {sharePasscode && <p className="text-xs text-surface-500 mb-3">口令：<span className="font-mono font-semibold text-surface-800">{sharePasscode}</span></p>}
              <div onClick={()=>{navigator.clipboard.writeText(shareUrl);toast('链接已复制');}} className="p-3 rounded-xl border border-surface-200 hover:border-brand-300 cursor-pointer bg-surface-50">
                <code className="text-xs text-surface-600 break-all font-mono">{shareUrl}</code>
                <p className="text-xs text-brand-500 font-medium mt-2">点击复制链接</p>
              </div>
              <button onClick={()=>{setShareOpen(false);setShareUrl('');setPublishToPlaza(false);setShareDesc('');setSharePasscode('');}} className="mt-4 text-sm text-surface-400 hover:text-brand-500">关闭</button>
            </div>
          )}
        </Modal>

        {/* Login/Register modal (#7) - prevents losing uploaded data */}
        <Modal open={loginModalOpen} onClose={()=>setLoginModalOpen(false)} maxWidth="max-w-sm">
          <div className="p-6">
            <div className="text-center mb-5">
              <h3 className="font-serif font-semibold text-lg">{loginMode==='login'?'登录':'注册'}以分享</h3>
              <p className="text-xs text-surface-400 mt-1">数据不会丢失，登录后即可分享</p>
            </div>
            <div className="space-y-3 mb-4">
              {loginMode==='register' && (
                <input value={lmNickname} onChange={e=>setLmNickname(e.target.value)} placeholder="昵称（2-16字符）" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/>
              )}
              <input type="email" value={lmEmail} onChange={e=>setLmEmail(e.target.value)} placeholder="邮箱" className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"/>
              <input type="password" value={lmPassword} onChange={e=>setLmPassword(e.target.value)} placeholder={loginMode==='login'?'密码':'密码（至少6位）'} className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 outline-none text-sm"
                onKeyDown={e=>{if(e.key==='Enter')handleLoginInModal();}}/>
            </div>
            {lmError && <p className="text-red-500 text-xs text-center mb-3">{lmError}</p>}
            <button onClick={handleLoginInModal} disabled={lmLoading} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 shadow-sm mb-3">
              {lmLoading ? '处理中...' : loginMode==='login' ? '登录' : '注册'}
            </button>
            <p className="text-center text-xs text-surface-400">
              {loginMode==='login' ? (<>还没有账号？<button onClick={()=>{setLoginMode('register');setLmError('');}} className="text-brand-500 font-medium">注册</button></>) : (<>已有账号？<button onClick={()=>{setLoginMode('login');setLmError('');}} className="text-brand-500 font-medium">登录</button></>)}
            </p>
          </div>
        </Modal>

        {dragging&&(<div className="fixed inset-0 z-[9999] bg-brand-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"><div className="bg-white rounded-2xl shadow-2xl p-10 text-center animate-scale-in"><p className="font-serif font-semibold text-lg">松开以上传文件</p></div></div>)}
      </div>
    );
  }

  // =================== LANDING ===================
  return (
    <div className="min-h-dvh">
      <Navbar/>
      <section className="relative px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-100/30 rounded-full blur-[100px]"/><div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-200/20 rounded-full blur-[80px]"/></div>
        <div className="relative max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-7 h-7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mb-3">AI Chat Viewer</h1>
          <p className="text-surface-500 text-[0.92rem] leading-relaxed mb-8 max-w-md mx-auto">上传 AI 对话导出文件，以对话界面重现你的 AI 对话<br/><span className="text-surface-400">支持 Claude / Gemini / ChatGPT</span></p>
          <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-surface-300 hover:border-brand-400 rounded-2xl p-10 cursor-pointer transition-all hover:bg-brand-50/30 hover:-translate-y-0.5 hover:shadow-lg group bg-white/50">
            <div className="w-12 h-12 rounded-xl bg-surface-100 group-hover:bg-brand-100 flex items-center justify-center mx-auto mb-3 transition-colors">
              <svg className="w-5 h-5 text-surface-400 group-hover:text-brand-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <p className="font-semibold text-[0.95rem] text-surface-700 mb-0.5">拖放文件到页面任意位置</p>
            <p className="text-sm text-surface-400">支持 .md / .json / .txt 格式</p>
            <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.json" className="hidden" onChange={e=>{if(e.target.files?.[0])handleFile(e.target.files[0]);}}/>
          </div>
        </div>
      </section>
      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10"><h2 className="font-serif text-xl sm:text-2xl font-semibold text-surface-800 mb-2">如何导出对话？</h2><p className="text-sm text-surface-400">使用浏览器插件一键导出，然后上传即可</p></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <a href="https://chromewebstore.google.com/detail/ai-chat-exporter-gemini-t/jfepajhaapfonhhfjmamediilplchakk" target="_blank" rel="noopener" className="group block p-5 rounded-2xl border border-surface-200 hover:border-blue-300 bg-white hover:bg-blue-50/30 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center shadow-sm"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 2c3 3.5 3 14.5 0 20M12 2c-3 3.5-3 14.5 0 20M2 12h20"/></svg></div><div><p className="font-semibold text-sm group-hover:text-blue-600 transition-colors">Gemini 对话导出</p><p className="text-xs text-surface-400">AI Chat Exporter</p></div></div>
              <p className="text-xs text-surface-500 leading-relaxed">导出 Google Gemini 对话为 MD 或 JSON 格式</p>
              <div className="mt-3 text-xs text-blue-500 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">安装插件 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
            </a>
            <a href="https://chromewebstore.google.com/detail/ai-chat-exporter-save-cla/elhmfakncmnghlnabnolalcjkdpfjnin" target="_blank" rel="noopener" className="group block p-5 rounded-2xl border border-surface-200 hover:border-brand-300 bg-white hover:bg-brand-50/30 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center shadow-sm"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div><p className="font-semibold text-sm group-hover:text-brand-600 transition-colors">Claude 对话导出</p><p className="text-xs text-surface-400">AI Chat Exporter</p></div></div>
              <p className="text-xs text-surface-500 leading-relaxed">导出 Anthropic Claude 对话为 MD 格式</p>
              <div className="mt-3 text-xs text-brand-500 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">安装插件 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
            </a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[{icon:'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',icon2:'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',t:'无需翻墙查看',d:'分享链接无需特殊网络'},
              {icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',icon2:'M9 7m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0',t:'无需登录查看',d:'对方无需账号即可浏览'},
              {icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',icon2:'',t:'隐私安全',d:'本地预览不上传数据'}
            ].map((item,i)=>(
              <div key={i} className="p-4"><div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center mx-auto mb-2"><svg className="w-4 h-4 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon}/>{item.icon2&&<path d={item.icon2}/>}</svg></div><p className="text-xs font-semibold text-surface-700">{item.t}</p><p className="text-[0.68rem] text-surface-400 mt-0.5">{item.d}</p></div>
            ))}
          </div>
        </div>
      </section>
      {dragging&&(<div className="fixed inset-0 z-[9999] bg-brand-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"><div className="bg-white rounded-2xl shadow-2xl p-10 text-center animate-scale-in"><div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg></div><p className="font-serif font-semibold text-lg">松开以上传文件</p><p className="text-sm text-surface-400 mt-1">支持 .md / .json / .txt</p></div></div>)}
    </div>
  );
}
