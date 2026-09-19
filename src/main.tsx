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
type RagSource = { id?: string; fileId: string; fileName: string; chunkIndex: number; similarity?: number };
type Document = { id: string; name: string; mimeType: string; sizeBytes: number; createdAt: string; indexed?: boolean; indexingStatus?: string };

const nav: NavItem[] = [
  { label: "AI Chat", icon: MessageSquare },
  { label: "Research", icon: Search },
  { label: "Create", icon: WandSparkles },
  { label: "Code", icon: Code2 },
  { label: "Agents", icon: Bot },
  { label: "Projects", icon: FolderKanban },
  { label: "Library", icon: Library },
];

async function analyzeCode() { setCodeRunning(true); try { const s=await supabase.auth.getSession(); const t=s.data.session?.access_token; if(!t) throw new Error("Sign in to analyze code."); const r=await fetch("/api/code/analyze",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({code:codeInput,language:"auto"})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Code analysis failed."); setCodeAnalysis(d.analysis||""); } catch(e:any){setCodeAnalysis(e?.message||"Code analysis failed.");} finally{setCodeRunning(false);} }

async function createImage() { setImageRunning(true); try { const s=await supabase.auth.getSession(); const t=s.data.session?.access_token; if(!t) throw new Error("Sign in to create images."); const r=await fetch("/api/create/image",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({prompt})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Image generation failed."); setCreatedImage(d.image||null); } catch(e:any){ setMessages(m=>[...m,{role:"assistant",content:e?.message||"Image generation failed."}]); } finally { setImageRunning(false); } }

async function runAdvancedResearch() { setResearchRunning(true); try { const s=await supabase.auth.getSession(); const t=s.data.session?.access_token; if(!t){setResearchSources([{title:"Authentication",url:"",snippet:"Sign in to run research."}]);return;} const r=await fetch("/api/research/advanced?q="+encodeURIComponent(prompt),{headers:{Authorization:"Bearer "+t}}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Research failed."); setResearchSources(d.sources||[]); } catch(e:any){setResearchSources([{title:"Research error",url:"",snippet:e?.message||"Research failed."}]);} finally {setResearchRunning(false);} }

async function runAgents() { setAgentRunning(true); try { const s=await supabase.auth.getSession(); const t=s.data.session?.access_token; if(!t){setAgentResults([{task:"Authentication",error:"Sign in to run agents."}]);return;} const r=await fetch("/api/agents/run",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({tasks:agentTasks})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Agent run failed."); setAgentResults(d.results||[]); } catch(e:any){setAgentResults([{task:"Agent run",error:e?.message||"Agent run failed."}]);} finally {setAgentRunning(false);} }
function formatBytes(bytes: number) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB", "TB"]; const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return (bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0) + " " + units[i]; }

function App() {
  const [sidebar, setSidebar] = useState(true);
  const [active, setActive] = useState("AI Chat");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); const [agentTasks,setAgentTasks]=useState<string[]>(["Research and summarize the key considerations for my task."]); const [agentResults,setAgentResults]=useState<any[]>([]); const [agentRunning,setAgentRunning]=useState(false);
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [researchReady, setResearchReady] = useState<boolean | null>(null);
  const [researchSources, setResearchSources] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [researchRunning,setResearchRunning]=useState(false);
  const [createdImage,setCreatedImage]=useState<string|null>(null);
  const [codeInput,setCodeInput]=useState(""); const [codeAnalysis,setCodeAnalysis]=useState(""); const [codeRunning,setCodeRunning]=useState(false);
  const [imageRunning,setImageRunning]=useState(false);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [modelCatalog, setModelCatalog] = useState<Array<{ provider: string; configured: boolean; model: string; selector: string }>>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareResults, setCompareResults] = useState<Array<{ provider?: string; model?: string; output?: string; error?: string }>>([]);
  const [comparing, setComparing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [ragSources, setRagSources] = useState<RagSource[]>([]);
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
      if (user) { void loadWorkspace(user.id); void loadDocuments(); }
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

  const loadDocuments = async () => {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session?.access_token) { setDocuments([]); return; }
    setLibraryLoading(true); setLibraryError(null);
    try {
      const response = await fetch("/api/documents", { headers: { Authorization: "Bearer " + session.access_token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load your document library.");
      setDocuments(data.files ?? []);
    } catch (error) { setLibraryError(error instanceof Error ? error.message : "Could not load your document library."); }
    finally { setLibraryLoading(false); }
  };
  const downloadDocument = async (id: string) => {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session?.access_token) { setAuthOpen(true); return; }
    try {
      const response = await fetch("/api/documents/" + id + "/download", { headers: { Authorization: "Bearer " + session.access_token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Download failed.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) { setLibraryError(error instanceof Error ? error.message : "Download failed."); }
  };
  const deleteDocument = async (id: string) => {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session?.access_token) { setAuthOpen(true); return; }
    try {
      const response = await fetch("/api/documents/" + id, { method: "DELETE", headers: { Authorization: "Bearer " + session.access_token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Delete failed.");
      setDocuments(items => items.filter(item => item.id !== id));
    } catch (error) { setLibraryError(error instanceof Error ? error.message : "Delete failed."); }
  };
  const sendMessage = async (text = prompt) => {
    const message = text.trim(); if (!message || loading) return;
    setPrompt(""); setMessages((items) => [...items, { role: "user", content: message }]); setLoading(true);
    try {
      let activeConversationId=conversationId;
      if(supabase&&!activeConversationId){const {data:s}=await supabase.auth.getSession();const uid=s.session?.user.id;if(uid){const {data:created}=await supabase.from("conversations").insert({user_id:uid,title:message.slice(0,70),model:selectedModel}).select("id").single();activeConversationId=created?.id??null;setConversationId(activeConversationId)}}
      if(active==="Research"){const response=await fetch("/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})});const d=await response.json();if(!response.ok)throw Error(d.error||"Research request failed.");setResearchSources(d.sources??[]);setMessages(items=>[...items,{role:"assistant",content:String(d.output??"")}]);return}
      const session=supabase?(await supabase.auth.getSession()).data.session:null;if(!session?.access_token){setAuthOpen(true);throw Error("Please sign in before using AI chat.")}
      const [provider,...modelParts]=selectedModel.split(":");const body:any={messages:[...messages,{role:"user",content:message}],conversationId:activeConversationId,useRag:true,documentIds:selectedDocumentIds};if(selectedModel!=="auto"){body.provider=provider;body.model=modelParts.join(":")}
      const response=await fetch("/api/ai/stream",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify(body)});if(!response.ok||!response.body){const d=await response.json().catch(()=>({}));throw Error(d.error||"AI streaming request failed.")}
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="",assistantText="",assistantIndex=-1;
      const addDelta=(delta:string)=>{assistantText+=delta;setMessages(items=>{const next=[...items];if(assistantIndex<0){assistantIndex=next.length;next.push({role:"assistant",content:assistantText})}else next[assistantIndex]={...next[assistantIndex],content:assistantText};return next})};
      while(true){const x=await reader.read();if(x.done)break;buffer+=decoder.decode(x.value,{stream:true});const events=buffer.split(/

/);buffer=events.pop()||"";for(const event of events){const line=event.split(/\r?
/).find(x=>x.startsWith("data:"));if(!line)continue;const d=JSON.parse(line.slice(5).trim());if(d.type==="delta"&&d.text)addDelta(d.text);if(d.type==="sources")setRagSources(d.sources??[]);if(d.type==="sources")setRagSources(d.sources??[]);if(d.type==="error")throw Error(d.error||"AI streaming failed.")}}
      if(!assistantText)throw Error("AI returned an empty response.");setResearchSources([]);
    }catch(error){setMessages(items=>[...items,{role:"assistant",content:error instanceof Error?error.message:"Something went wrong."}])}finally{setLoading(false)}
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!supabase) { setAuthOpen(true); return; }
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) { setAuthOpen(true); return; }
    if (file.size > 25 * 1024 * 1024) { setMessages(items => [...items, { role: "assistant", content: "This document exceeds the 25 MB upload limit." }]); return; }
    setUploading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/documents/analyze", { method: "POST", headers: { Authorization: "Bearer " + session.access_token }, body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Document upload failed.");
      await loadDocuments(); setActive("Library");
      setMessages(items => [...items, { role: "assistant", content: "Uploaded “" + data.filename + "” successfully. Extracted " + (data.chunks ?? 0) + " chunks and " + (data.indexing?.status === "indexed" ? "indexed it for private RAG." : "saved it; embeddings are not configured yet.") }]);
    } catch (error) { setMessages(items => [...items, { role: "assistant", content: error instanceof Error ? error.message : "Document upload failed." }]); }
    finally { setUploading(false); }
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

  const toggleDocument = (id: string) => setSelectedDocumentIds(items => items.includes(id) ? items.filter(x => x !== id) : [...items, id]);

  const chatWithDocument = (id: string) => { setSelectedDocumentIds([id]); setActive("AI Chat"); setPrompt("Ask a question about this document: "); };

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
          {active === "Code" ? (<div className="code-panel"><div className="comparison-header"><div><strong>Code Workspace</strong><span>Analyze, debug, secure and improve code with AI.</span></div><button className="tool-btn" onClick={()=>void analyzeCode()} disabled={!codeInput.trim()||codeRunning}>{codeRunning?"Analyzing…":"Analyze code"}</button></div><textarea value={codeInput} onChange={e=>setCodeInput(e.target.value)} rows={14} placeholder="Paste your JavaScript, TypeScript, React, Node.js, Python, or other code here…"/>{codeAnalysis&&<div className="source-card"><div><strong>AI analysis</strong><p>{codeAnalysis}</p></div></div>}</div>) : active === "Create" ? (<div className="create-panel"><div className="comparison-header"><div><strong>AI Creative Studio</strong><span>Generate real images from your prompt.</span></div><button className="tool-btn" onClick={()=>void createImage()} disabled={!prompt.trim()||imageRunning}>{imageRunning?"Creating…":"Generate image"}</button></div>{createdImage&&<img src={createdImage} alt="AI generated artwork" style={{maxWidth:"100%",borderRadius:16,display:"block",marginTop:16}}/>}<p>Describe the image you want in the composer below, then generate it here.</p></div>) : active === "Agents" ? (<div className="agent-panel"><div className="comparison-header"><div><strong>AI Agents</strong><span>Run multiple AI tasks in parallel.</span></div><button className="tool-btn" onClick={()=>void runAgents()} disabled={agentRunning}>{agentRunning?"Running…":"Run tasks"}</button></div>{agentTasks.map((task,index)=><div className="agent-task" key={index}><input value={task} onChange={e=>setAgentTasks(agentTasks.map((x,i)=>i===index?e.target.value:x))}/></div>)}<button className="tool-btn" onClick={()=>setAgentTasks([...agentTasks,"New task"])}>+ Add task</button>{agentResults.map((x,i)=><div className="source-card" key={i}><span>{i+1}</span><div><strong>{x.task}</strong><p>{x.error||x.output}</p></div></div>)}</div>) : active === "Library" ? (
            <div className="library-panel">
              <div className="comparison-header"><div><strong>Document Library</strong><span>Your private documents stored in Supabase and available to RAG.</span></div><button className="tool-btn" onClick={() => void loadDocuments()} disabled={libraryLoading}>{libraryLoading ? "Refreshing…" : "Refresh"}</button></div>
              {libraryError && <div className="library-error">{libraryError}</div>}
              {libraryLoading && documents.length === 0 ? <div className="comparison-empty">Loading your documents…</div> : documents.length === 0 ? <div className="comparison-empty"><FileText size={24} /><p>No documents yet.</p><span>Use Attach below to upload a PDF, DOCX, TXT, or supported text file.</span></div> : <div className="document-list">{documents.map(doc => <div className="document-card" key={doc.id}><div className="quick-icon"><FileText size={18} /></div><div className="document-info"><strong>{doc.name}</strong><small>{formatBytes(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString()} · {doc.indexed ? "Indexed" : "Not indexed"}</small></div><button className="tool-btn" onClick={() => chatWithDocument(doc.id)}>Chat</button><button className="tool-btn" onClick={() => void downloadDocument(doc.id)}>Open</button><button className={selectedDocumentIds.includes(doc.id) ? "tool-btn active" : "tool-btn"} onClick={() => toggleDocument(doc.id)}>{selectedDocumentIds.includes(doc.id) ? "Selected" : "Select"}</button><button className="icon-btn" onClick={() => void deleteDocument(doc.id)} aria-label={"Delete " + doc.name}><X size={17} /></button></div>)}</div>}
            </div>
          ) : (
          <>
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

          {selectedDocumentIds.length > 0 && active === "AI Chat" && <div className="library-error">Document chat active: {selectedDocumentIds.length} selected document{selectedDocumentIds.length > 1 ? "s" : ""}. <button className="tool-btn" onClick={() => setSelectedDocumentIds([])}>Clear</button></div>}

          {ragSources.length > 0 && active === "AI Chat" && <div className="research-sources"><div className="comparison-header"><div><strong>Document sources</strong><span>Relevant excerpts used for this answer.</span></div></div>{ragSources.map((source) => <div className="source-card" key={source.id}><span>§</span><div><strong>{source.fileName}</strong><small>Chunk {source.chunkIndex + 1} · {Math.round(source.similarity * 100)}% similarity</small></div></div>)}</div>}

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

          {ragSources.length > 0 && active === "AI Chat" && <div className="research-sources"><div className="comparison-header"><div><strong>Document sources</strong><span>Private document chunks used for this answer.</span></div></div>{ragSources.map((source, index) => <div className="source-card" key={source.fileId + "-" + source.chunkIndex}><span>{index + 1}</span><div><strong>{source.fileName}</strong><small>Chunk {source.chunkIndex + 1}{typeof source.similarity === "number" ? " · " + (source.similarity * 100).toFixed(1) + "% match" : ""}</small></div></div>)}</div>}

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

          </>)}

          <div className="composer-wrap">
            <div className="composer">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Ask BEST OF ALL AI anything..." rows={3} disabled={loading} />
              <div className="composer-tools">
                <div className="tool-row">
                  <input ref={fileInputRef} className="file-input" type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.js,.ts,.tsx,.jsx,.css,.html,.log,text/*,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileUpload} />
                  <button className="tool-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Paperclip size={17} /> {uploading ? "Uploading…" : "Attach"}</button>
                  <button className="tool-btn"><Mic size={17} /> Voice</button>
                  <button className="tool-btn" onClick={() => void compareModels()} disabled={!prompt.trim() || comparing}><Sparkles size={17} /> Compare</button><button className="tool-btn" onClick={() => void runAdvancedResearch()} disabled={!prompt.trim() || researchRunning}><Search size={17} /> {researchRunning?"Researching…":"Fast Research"}</button>
                </div>
                <button className="send-btn" disabled={!prompt.trim() || loading} onClick={() => void sendMessage()} aria-label="Send"><Send size={17} /></button>
              </div>
            </div>
            <p className="disclaimer">{selectedDocumentIds.length > 0 ? `${selectedDocumentIds.length} document${selectedDocumentIds.length === 1 ? "" : "s"} selected for RAG. ` : ""}{!supabaseConfigured ? "Connect Supabase to enable accounts and persistent user data. " : userEmail ? `Signed in as ${userEmail}. Conversations are saved to Supabase. ` : "Sign in to save your workspace. "}{apiReady === false ? "Configure an AI provider key on the server to enable live AI responses. " : ""}{active === "Research" && researchReady === false ? "Add BRAVE_SEARCH_API_KEY on the server to enable web research. " : ""}AI output can be inaccurate. Verify important information.</p>
          </div>
        </section>
      </main>
      {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
