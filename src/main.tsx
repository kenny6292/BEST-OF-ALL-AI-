import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  BrainCircuit,
  Code2,
  FileText,
  FolderKanban,
  Image,
  Library,
  Menu,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import "./styles.css";

type NavItem = { label: string; icon: typeof MessageSquare };

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

  return (
    <div className="app-shell">
      {sidebar && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark"><Sparkles size={18} /></div>
            <div>
              <strong>BEST OF ALL AI</strong>
              <span>AI Command Center</span>
            </div>
          </div>

          <button className="new-chat" onClick={() => setActive("AI Chat")}>
            <Plus size={18} /> New chat
          </button>

          <nav>
            {nav.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={active === label ? "nav-item active" : "nav-item"}
                onClick={() => setActive(label)}
              >
                <Icon size={18} />
                {label}
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
            <small>Best model for the task</small>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Search"><Search size={18} /></button>
            <div className="avatar">K</div>
          </div>
        </header>

        <section className="content">
          <div className="hero">
            <div className="eyebrow"><Sparkles size={15} /> Unified intelligence workspace</div>
            <h1>What do you want to <span>accomplish?</span></h1>
            <p>Chat, research, create, code, analyze and automate from one intelligent workspace.</p>
          </div>

          <div className="quick-grid">
            {[
              [Search, "Deep Research", "Search, cross-check and synthesize"],
              [Image, "Create", "Generate and transform creative assets"],
              [Code2, "Build", "Write, debug and review code"],
              [FileText, "Analyze", "Understand documents and data"],
            ].map(([Icon, title, description]) => {
              const C = Icon as typeof Search;
              return (
                <button className="quick-card" key={title as string} onClick={() => setActive(title as string)}>
                  <div className="quick-icon"><C size={19} /></div>
                  <strong>{title as string}</strong>
                  <span>{description as string}</span>
                </button>
              );
            })}
          </div>

          <div className="composer-wrap">
            <div className="composer">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask BEST OF ALL AI anything..."
                rows={3}
              />
              <div className="composer-tools">
                <div className="tool-row">
                  <button className="tool-btn"><Paperclip size={17} /> Attach</button>
                  <button className="tool-btn"><Mic size={17} /> Voice</button>
                  <button className="tool-btn"><Sparkles size={17} /> Tools</button>
                </div>
                <button className="send-btn" disabled={!prompt.trim()} aria-label="Send">
                  <Send size={17} />
                </button>
              </div>
            </div>
            <p className="disclaimer">AI output can be inaccurate. Verify important information.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
