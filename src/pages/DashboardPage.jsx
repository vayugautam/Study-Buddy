import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import Icon from "../components/Icon";
import { Alert, EmptyState, LoadingState, PageHeading, StatusPill, formatDate } from "../components/UI";

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.documents(), api.conversations()])
      .then(([docs, chats]) => { if (active) { setDocuments(docs); setConversations(chats); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const ready = documents.filter((item) => item.status === "completed").length;
  const inProgress = documents.filter((item) => ["pending", "processing"].includes(item.status)).length;
  const recentDocs = [...documents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  const recentChats = conversations.slice(0, 4);

  return <>
    <PageHeading eyebrow="YOUR LEARNING SPACE" title="A good day to learn something." description="Your documents, conversations, and next steps — all in one place." action={<Link to="/app/documents" className="button button-dark"><Icon name="upload" size={17} /> Add a PDF</Link>} />
    <Alert>{error}</Alert>
    {loading ? <LoadingState /> : <>
      <section className="stats-grid" aria-label="Workspace summary">
        <article className="stat-card"><span className="stat-icon stat-icon-sage"><Icon name="files" /></span><span className="stat-label">Your library</span><strong className="stat-value">{documents.length}</strong><span className="stat-foot">{documents.length === 1 ? "document" : "documents"} uploaded</span></article>
        <article className="stat-card"><span className="stat-icon stat-icon-gold"><Icon name="check" /></span><span className="stat-label">Ready to study</span><strong className="stat-value">{ready}</strong><span className="stat-foot">{inProgress ? `${inProgress} still processing` : "fully indexed for chat"}</span></article>
        <article className="stat-card"><span className="stat-icon stat-icon-lilac"><Icon name="chat" /></span><span className="stat-label">Study sessions</span><strong className="stat-value">{conversations.length}</strong><span className="stat-foot">persistent conversations</span></article>
        <Link to="/app/chat" className="stat-card stat-card-cta"><span className="cta-spark"><Icon name="spark" size={22} /></span><span className="stat-label">Ready when you are</span><strong className="cta-title">Start a study session</strong><span className="cta-link">Ask your materials a question <Icon name="arrow" size={15} /></span></Link>
      </section>

      <div className="dashboard-columns">
        <section className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">YOUR LIBRARY</span><h2>Recent documents</h2></div><Link className="subtle-link" to="/app/documents">View all <Icon name="arrow" size={15} /></Link></div>
          {recentDocs.length ? <div className="compact-list">{recentDocs.map((doc) => <div className="compact-row" key={doc.id}><span className="file-icon"><Icon name="files" size={18} /></span><div className="compact-copy"><strong title={doc.filename}>{doc.filename}</strong><span>Added {formatDate(doc.created_at)}</span></div><StatusPill status={doc.status} /></div>)}</div> : <EmptyState icon="files" title="Your library is ready" description="Add your first PDF and Study Buddy will prepare it for questions." action={<Link to="/app/documents" className="button button-outline button-small"><Icon name="upload" size={16} /> Upload a PDF</Link>} />}
        </section>
        <section className="panel-card">
          <div className="panel-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Recent conversations</h2></div><Link className="subtle-link" to="/app/conversations">View all <Icon name="arrow" size={15} /></Link></div>
          {recentChats.length ? <div className="compact-list">{recentChats.map((chat) => <Link className="compact-row compact-row-link" key={chat.id} to={`/app/chat?conversation=${chat.id}`}><span className="chat-row-icon"><Icon name="chat" size={18} /></span><div className="compact-copy"><strong>{chat.title}</strong><span>{chat.document_ids.length ? `${chat.document_ids.length} selected ${chat.document_ids.length === 1 ? "document" : "documents"}` : "All documents"} · {formatDate(chat.updated_at)}</span></div><Icon name="arrow" size={16} className="row-arrow" /></Link>)}</div> : <EmptyState icon="chat" title="No conversations yet" description="Start with a question, then keep the conversation going." action={<Link to="/app/chat" className="button button-outline button-small"><Icon name="plus" size={16} /> Start chatting</Link>} />}
        </section>
      </div>
      <div className="dashboard-footnote"><span className="footnote-mark"><Icon name="spark" size={15} /></span><span>Answers use the documents in your chosen scope and include source citations when evidence is available.</span></div>
    </>}
  </>;
}
