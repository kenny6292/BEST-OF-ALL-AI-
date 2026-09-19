import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot, BrainCircuit, Code2, FileText, FolderKanban, Image, Library, Menu,
  MessageSquare, Mic, Paperclip, Plus, Search, Send, Settings, Sparkles,
  Users, WandSparkles, X
} from "lucide-react";
import "./styles.css";

type NavItem = { label: string; icon: typeof MessageSquare };
type Message = { role: "user" | "assistant"; content: string };

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
  const [loading, setLoading] = useState(false);
  const [apiReady, setApiReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setApiReady(Boolean(data.providers?.openai)))
      .catch(() => setApiReady(false));
  }, []);

  const sendMessage = async (text = prompt) => {
    const message = text.trim();
    if (!message || loading) return;
    setPrompt("");
    setMessages((items) => [...items, { role: "user", content: message }]);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed.");
      setMessages((items) => [...items, { role: "assistant", content: data.output }]);
    } catch (error) {
      setMessages((items) => [
        ...items,
        { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {sidebar && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark"><Sparkles size={18} /></div>
            <div><strong>BEST OF ALL AI</strong><span>AI Command Center</span></div>
          </div>
          <button className="new-chat" onClick={() => { setActive("AI Chat"); setMessages([]); }}>
            <Plus size={18} /> New chat
          </button>
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
          <button className="icon-btn" onClick={() => setSidebar(!sidebar)} aria-label="Toggle sidebar">
            {sidebar ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="model-picker">
            <BrainCircuit size={17} />
            <span>Auto</span>
            <small>{apiReady === true ? "OpenAI connected" : apiReady === false ? "Configure AI key" : "Checking connection..."}</small>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Search"><Search size={18} /></button>
            <div className="avatar">K</div>
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
                <div className={message.role === "user" ? "message user-message" : "message assistant-message"} key={index}>
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
                  <button className="quick-card" key={title as string} onClick={() => { setActive(title as string); setPrompt(title === "Deep Research" ? "Research this topic and give me a sourced summary: " : title === "Build" ? "Help me build: " : title === "Analyze" ? "Analyze this: " : "Create this: "); }}>
                    <div className="quick-icon"><C size={19} /></div>
                    <strong>{title as string}</strong>
                    <span>{description as string}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="composer-wrap">
            <div className="composer">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                placeholder="Ask BEST OF ALL AI anything..."
                rows={3}
                disabled={loading}
              />
              <div className="composer-tools">
                <div className="tool-row">
                  <button className="tool-btn"><Paperclip size={17} /> Attach</button>
                  <button className="tool-btn"><Mic size={17} /> Voice</button>
                  <button className="tool-btn"><Sparkles size={17} /> Tools</button>
                </div>
                <button className="send-btn" disabled={!prompt.trim() || loading} onClick={() => void sendMessage()} aria-label="Send">
                  <Send size={17} />
                </button>
              </div>
            </div>
            <p className="disclaimer">{apiReady === false ? "Connect OPENAI_API_KEY on the server to enable live AI responses." : "AI output can be inaccurate. Verify important information."}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
