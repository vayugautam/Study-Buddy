import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import Icon from "../components/Icon";
import { Alert, EmptyState, LoadingState, PageHeading, formatDate } from "../components/UI";

export default function ConversationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    let active = true;
    api.conversations().then((result) => { if (active) setItems(result); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function removeConversation(id) {
    if (!window.confirm("Delete this conversation and its saved messages?")) return;
    setDeleting(id); setError("");
    try { await api.deleteConversation(id); setItems((current) => current.filter((item) => item.id !== id)); }
    catch (e) { setError(e.message); }
    finally { setDeleting(""); }
  }

  return <>
    <PageHeading eyebrow="YOUR STUDY HISTORY" title="Conversations" description="Return to a previous session and continue with the same saved context." action={<Link to="/app/chat" className="button button-dark"><Icon name="plus" size={17} /> New session</Link>} />
    <Alert>{error}</Alert>
    <section className="history-card">
      <div className="history-card-head"><div><span className="eyebrow">SAVED SESSIONS</span><h2>{items.length} {items.length === 1 ? "conversation" : "conversations"}</h2></div><span className="privacy-chip"><Icon name="check" size={14} /> Private to you</span></div>
      {loading ? <LoadingState label="Loading conversations" /> : items.length ? <div className="history-list">{items.map((item) => <article className="history-row" key={item.id}><span className="history-icon"><Icon name="chat" size={19} /></span><div className="history-copy"><strong>{item.title}</strong><span>{item.retrieval_scope === "all_documents" ? "All documents" : `${item.document_ids.length} ${item.document_ids.length === 1 ? "document" : "documents"}`} · Updated {formatDate(item.updated_at)}</span></div><Link to={`/app/chat?conversation=${item.id}`} className="button button-outline button-small">Open <Icon name="arrow" size={14} /></Link><button className="icon-button action-delete" disabled={deleting === item.id} title="Delete conversation" aria-label={`Delete ${item.title}`} onClick={() => removeConversation(item.id)}><Icon name="trash" size={17} /></button></article>)}</div> : <EmptyState icon="chat" title="Your next study session starts here" description="New conversations save your questions and answers so you can pick them up later." action={<Link to="/app/chat" className="button button-dark button-small"><Icon name="plus" size={16} /> Start a session</Link>} />}
    </section>
  </>;
}
