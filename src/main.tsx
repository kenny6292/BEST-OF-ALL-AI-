import { StrictMode, useEffect, useRef, useState, type ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot, BrainCircuit, Code2, FileText, FolderKanban, Image, Library, Menu,
  MessageSquare, Mic, Paperclip, Plus, Search, Send, Settings, Sparkles,
  Users, WandSparkles, X
} from "lucide-react";
import "./styles.css";
import { AuthPanel } from "./components/AuthPanel";
import { supabase, supabaseConfigured } from "./lib/supabase";

type NavItem = { label: string; icon: typeof MessageSquare };
type Message = { role: "user" | "assistant"; content: string; id?: string };

const nav: NavItem[] = [
  { label: "AI Chat", icon: MessageSquare },
  { label: "Research", icon: Search },
  { label: "Create", icon: WandSparkles },
  { label: "Code", icon: Code2 },
  { label: "Agents", icon: Bot },
  { label: "Projects", icon: FolderKanban },
  { label: "Library", icon: Library },
];

function App() {
  const [sidebar, setSidebar] = useState(true);
  const [active, setActive] = useState("AI Chat");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [researchReady, setResearchReady] = useState<boolean | null>(null);
  const [researchSources, setResearchSources] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [modelCatalog, setModelCatalog] = useState<Array<{ provider: string; configured: boolean; model: string; selector: string }>>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareResults, setCompareResults] = useState<Array<{ provider?: string; model?: string; output?: string; error?: string }>>([]);
  const [comparing, setComparing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadWorkspace = async (userId: string) => {
    if (!supabase) return;
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id,title")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      setConversationId(null);
      setMessages([]);
      return;
    }

    const { data } = await supabase
      .from("messages")
      .select("id,role,content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    setConversationId(conversation.id);
    setMessages((data ?? []).filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    })));
  };

  useEffect(() => {
    fetch("/api/ai/providers")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setModelCatalog((data.providers ?? []).map((p: any) => ({...p, selector: `${p.provider}:${p.model}`}))))
      .catch(() => setModelCatalog([]));

    fetch("/api/research/status")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setResearchReady(Boolean(data.configured)))
      .catch(() => setResearchReady(false));

    fetch("/api/health")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setApiReady(Boolean(data.aiConfigured)))
      .catch(() => setApiReady(false));

    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setUserEmail(user?.email ?? null);
      if (user) void loadWorkspace(user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setUserEmail(user?.email ?? null);
      if (user) void loadWorkspace(user.id);
      else {
        setConversationId(null);
        setMessages([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const sendMessage = async (text = prompt) => {
    const message = text.trim(); if (!message || loading) return;
    setPrompt(""); setMessages((items) => [...items, { role: "user", content: message }]); setLoading(true);
    try {
      let activeConversationId=conversationId;
      if(supabase&&!activeConversationId){const {data:s}=await supabase.auth.getSession();const uid=s.session?.user.id;if(uid){const {data:created}=await supabase.from("conversations").insert({user_id:uid,title:message.slice(0,70),model:selectedModel}).select("id").single();activeConversationId=created?.id??null;setConversationId(activeConversationId)}}
      if(active==="Research"){const response=await fetch("/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})});const d=await response.json();if(!response.ok)throw Error(d.error||"Research request failed.");setResearchSources(d.sources??[]);setMessages(items=>[...items,{role:"assistant",content:String(d.output??"")}]);return}
      const session=supabase?(await supabase.auth.getSession()).data.session:null;if(!session?.access_token){setAuthOpen(true);throw Error("Please sign in before using AI chat.")}
      const [provider,...modelParts]=selectedModel.split(":");const body:any={messages:[...messages,{role:"user",content:message}],conversationId:activeConversationId};if(selectedModel!=="auto"){body.provider=provider;body.model=modelParts.join(":")}
      const response=await fetch("/api/ai/stream",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify(body)});if(!response.ok||!response.body){const d=await response.json().catch(()=>({}));throw Error(d.error||"AI streaming request failed.")}
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="",assistantText="",assistantIndex=-1;
      const addDelta=(delta:string)=>{assistantText+=delta;setMessages(items=>{const next=[...items];if(assistantIndex<0){assistantIndex=next.length;next.push({role:"assistant",content:assistantText})}else next[assistantIndex]={...next[assistantIndex],content:assistantText};return next})};
      while(true){const x=await reader.read();if(x.done)break;buffer+=decoder.decode(x.value,{stream:true});const events=buffer.split(/\n\n/);buffer=events.pop()||"";for(const event of events){const line=event.split(/\r?\n/).find(x=>x.startsWith("data:"));if(!line)continue;const d=JSON.parse(line.slice(5).trim());if(d.type==="delta"&&d.text)addDelta(d.text);if(d.type==="error")throw Error(d.error||"AI streaming failed.")}}
      if(!assistantText)throw Error("AI returned an empty response.");setResearchSources([]);
    }catch(error){setMessages(items=>[...items,{role:"assistant",content:error instanceof Error?error.message:"Something went wrong."}])}finally{setLoading(false)}
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!supabase) {
      setAuthOpen(true);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setAuthOpen(true);
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setMessages((items) => [...items, { role: "assistant", content: "This upload is larger than 6 MB. For larger files, resumable uploads should be used." }]);
      return;
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("ai-files").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase.from("files").insert({
        user_id: userId,
        name: file.name,
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      if (metadataError) throw metadataError;

      const textTypes = [
        "text/", "application/json", "application/xml", "application/javascript",
        "application/x-javascript", "application/csv"
      ];
      const isText = textTypes.some((type) => file.type.startsWith(type)) ||
        /\.(txt|md|csv|json|xml|js|ts|tsx|jsx|css|html|log)$/i.test(file.name);

      if (!isText) {
        setMessages((items) => [...items, {
          role: "assistant",
          content: `Uploaded “${file.name}” successfully. This first document-analysis release can analyze text-based files directly; PDF/DOCX extraction will be added in the next document-processing layer.`
        }]);
        return;
      }

      const content = await file.text();
      const clipped = content.slice(0, 50000);
      await sendMessage(`Analyze the uploaded file “${file.name}”.\n\nFile contents:\n\n${clipped}${content.length > 50000 ? "\n\n[Content truncated at 50,000 characters.]" : ""}`);
    } catch (error) {
      setMessages((items) => [...items, { role: "assistant", content: error instanceof Error ? error.message : "File upload failed." }]);
    } finally {
      setUploading(false);
    }
  };

  const compareModels = async () => {
    const message = prompt.trim();
    if (!message || comparing) return;
    setComparing(true);
    setCompareOpen(true);
    setCompareResults([]);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Comparison failed.");
      setCompareResults(data.results ?? []);
    } catch (error) {
      setCompareResults([{ error: error instanceof Error ? error.message : "Comparison failed." }]);
    } finally {
      setComparing(false);
    }
  };

  const startNewChat = () => {
    setActive("AI Chat");
    setResearchSources([]);
    setConversationId(null);
    setMessages([]);
    setPrompt("");
  };

  return (
    <div className="app-shell">
      {sidebar && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark"><Sparkles size={18} /></div>
            <div><strong>BEST OF ALL AI</strong><span>AI Command Center</span></div>
          </div>
          <button className="new-chat" onClick={startNewChat}><Plus size={18} /> New chat</button>
          <nav>
            {nav.map(({ label, icon: Icon }) => (
              <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button className="nav-item"><Users size={18} /> Team workspace</button>
            <button className="nav-item"><Settings size={18} /> Settings</button>
          </div>
        </aside>
      )}

      <main className="workspace">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSidebar(!sidebar)} aria-label="Toggle sidebar">{sidebar ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="model-picker">
            <BrainCircuit size={17} />
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} aria-label="Select AI model">
              <option value="auto">Auto</option>
              {modelCatalog.map((item) => (
                <option key={item.selector} value={item.selector} disabled={!item.configured}>
                  {item.provider} · {item.model}{item.configured ? "" : " · not configured"}
                </option>
              ))}
            </select>
            <small>{active === "Research" ? (researchReady === true ? "Web research available" : researchReady === false ? "Configure search API" : "Checking research...") : (apiReady === true ? "AI provider available" : apiReady === false ? "Configure an AI key" : "Checking connection...")}</small>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Search"><Search size={18} /></button>
            <button className="avatar" onClick={() => setAuthOpen(true)} aria-label="Account">{userEmail ? userEmail.slice(0, 1).toUpperCase() : "K"}</button>
          </div>
        </header>

        <section className="content">
          {messages.length === 0 ? (
            <div className="hero">
              <div className="eyebrow"><Sparkles size={15} /> Unified intelligence workspace</div>
              <h1>What do you want to <span>accomplish?</span></h1>
              <p>Chat, research, create, code, analyze and automate from one intelligent workspace.</p>
            </div>
          ) : (
            <div className="conversation">
              {messages.map((message, index) => (
                <div className={message.role === "user" ? "message user-message" : "message assistant-message"} key={message.id ?? index}>
                  <span className="message-label">{message.role === "user" ? "You" : "BEST OF ALL AI"}</span>
                  <div>{message.content}</div>
                </div>
              ))}
              {loading && <div className="message assistant-message"><span className="message-label">BEST OF ALL AI</span><div>Thinking…</div></div>}
            </div>
          )}

          {messages.length === 0 && (
            <div className="quick-grid">
              {[
                [Search, "Deep Research", "Search, cross-check and synthesize"],
                [Image, "Create", "Generate and transform creative assets"],
                [Code2, "Build", "Write, debug and review code"],
                [FileText, "Analyze", "Understand documents and data"],
              ].map(([Icon, title, description]) => {
                const C = Icon as typeof Search;
                return (
                  <button className="quick-card" key={title as string} onClick={() => { setActive(title === "Deep Research" ? "Research" : title as string); setPrompt(title === "Deep Research" ? "Research this topic and give me a sourced summary: " : title === "Build" ? "Help me build: " : title === "Analyze" ? "Analyze this: " : "Create this: "); }}>
                    <div className="quick-icon"><C size={19} /></div>
                    <strong>{title as string}</strong>
                    <span>{description as string}</span>
                  </button>
                );
              })}
            </div>
          )}

          {researchSources.length > 0 && active === "Research" && (
            <div className="research-sources">
              <div className="comparison-header"><div><strong>Research sources</strong><span>Live results returned by the configured search provider.</span></div></div>
              {researchSources.map((source, index) => (
                <a className="source-card" href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                  <span>{index + 1}</span><div><strong>{source.title}</strong><small>{source.url}</small><p>{source.snippet}</p></div>
                </a>
              ))}
            </div>
          )}

          {compareOpen && (
            <div className="comparison-panel">
              <div className="comparison-header">
                <div><strong>Model comparison</strong><span>Same prompt sent to every configured provider.</span></div>
                <button className="icon-btn" onClick={() => setCompareOpen(false)} aria-label="Close comparison"><X size={17} /></button>
              </div>
              {comparing && <div className="comparison-empty">Comparing configured models…</div>}
              {!comparing && compareResults.map((result, index) => (
                <div className="comparison-card" key={result.provider ?? index}>
                  <div className="comparison-meta"><strong>{result.provider ?? "Provider"}</strong><span>{result.model ?? ""}</span></div>
                  <p>{result.error ?? result.output}</p>
                </div>
              ))}
              {!comparing && compareResults.length === 0 && <div className="comparison-empty">No configured providers are available.</div>}
            </div>
          )}

          <div className="composer-wrap">
            <div className="composer">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Ask BEST OF ALL AI anything..." rows={3} disabled={loading} />
              <div className="composer-tools">
                <div className="tool-row">
                  <input ref={fileInputRef} className="file-input" type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.js,.ts,.tsx,.jsx,.css,.html,.log,text/*,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileUpload} />
                  <button className="tool-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Paperclip size={17} /> {uploading ? "Uploading…" : "Attach"}</button>
                  <button className="tool-btn"><Mic size={17} /> Voice</button>
                  <button className="tool-btn" onClick={() => void compareModels()} disabled={!prompt.trim() || comparing}><Sparkles size={17} /> Compare</button>
                </div>
                <button className="send-btn" disabled={!prompt.trim() || loading} onClick={() => void sendMessage()} aria-label="Send"><Send size={17} /></button>
              </div>
            </div>
            <p className="disclaimer">{!supabaseConfigured ? "Connect Supabase to enable accounts and persistent user data. " : userEmail ? `Signed in as ${userEmail}. Conversations are saved to Supabase. ` : "Sign in to save your workspace. "}{apiReady === false ? "Configure an AI provider key on the server to enable live AI responses. " : ""}{active === "Research" && researchReady === false ? "Add BRAVE_SEARCH_API_KEY on the server to enable web research. " : ""}AI output can be inaccurate. Verify important information.</p>
          </div>
        </section>
      </main>
      {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
