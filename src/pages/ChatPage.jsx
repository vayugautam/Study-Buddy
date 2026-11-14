import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../api/client";
import Icon from "../components/Icon";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { Alert, EmptyState, LoadingState, StatusPill, formatDate } from "../components/UI";

const scopeCopy = {
  single_document: { label: "One document", help: "Keep the conversation focused on one PDF." },
  selected_documents: { label: "Selected documents", help: "Compare ideas across the PDFs you choose." },
  all_documents: { label: "All documents", help: "Search every completed PDF in your library." },
};

function DocumentChoices({ documents, scope, selectedIds, onChange }) {
  const readyDocs = documents.filter((doc) => doc.status === "completed");
  if (scope === "all_documents") return <div className="scope-all-note"><Icon name="check" size={16} /> All {readyDocs.length} completed {readyDocs.length === 1 ? "document" : "documents"} will be available.</div>;
  if (!readyDocs.length) return <div className="scope-empty">Upload and finish processing a PDF before starting a document-scoped chat.</div>;
  return <div className="scope-documents">{readyDocs.map((doc) => {
    const checked = selectedIds.includes(doc.id);
    return <label className={`scope-document ${checked ? "scope-document-selected" : ""}`} key={doc.id}>
      <input type={scope === "single_document" ? "radio" : "checkbox"} name="scope-document" checked={checked} onChange={() => onChange(doc.id)} />
      <span className="file-icon"><Icon name="files" size={17} /></span><span className="scope-doc-name">{doc.filename}</span><StatusPill status={doc.status} />
    </label>;
  })}</div>;
}

function ScopeOptions({ scope, onScopeChange }) {
  return <div className="scope-options">{Object.entries(scopeCopy).map(([value, item]) => <button key={value} type="button" onClick={() => onScopeChange(value)} className={`scope-option ${scope === value ? "scope-option-active" : ""}`} aria-pressed={scope === value}><span className="scope-option-check"><Icon name="check" size={13} /></span><span><strong>{item.label}</strong><small>{item.help}</small></span></button>)}</div>;
}

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get("conversation");
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [citationMap, setCitationMap] = useState({});
  const [scope, setScope] = useState("single_document");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingScope, setSavingScope] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [scopeEditing, setScopeEditing] = useState(false);
  const [scopeDirty, setScopeDirty] = useState(false);
  const messageEndRef = useRef(null);
  const initialSelectionSet = useRef(false);
  const readyDocs = useMemo(() => documents.filter((doc) => doc.status === "completed"), [documents]);

  const loadLists = useCallback(async () => {
    const [docs, chats] = await Promise.all([api.documents(), api.conversations()]);
    setDocuments(docs); setConversations(chats);
  }, []);

  useEffect(() => {
    let active = true;
    loadLists().catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadLists]);

  useEffect(() => {
    if (loading || initialSelectionSet.current) return;
    initialSelectionSet.current = true;
    if (!activeId && readyDocs.length) setSelectedIds([readyDocs[0].id]);
  }, [activeId, loading, readyDocs]);

  useEffect(() => {
    if (!activeId) {
      setDetail(null); setMessages([]); setCitationMap({}); setScopeEditing(false); setScopeDirty(false); return undefined;
    }
    let active = true;
    setDetailLoading(true); setError(""); setNotice(""); setCitationMap({});
    api.conversation(activeId)
      .then((result) => {
        if (!active) return;
        setDetail(result); setMessages(result.messages || []);
        setCitationMap(Object.fromEntries((result.messages || []).filter((message) => message.role === "assistant" && message.citations?.length).map((message) => [message.id, message.citations])));
        setScope(result.retrieval_scope);
        setSelectedIds(result.document_ids || []); setScopeDirty(false);
      })
      .catch((e) => { if (active) { setError(e.message); setDetail(null); } })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [activeId]);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  function toggleDocument(id) {
    setSelectedIds((current) => {
      if (scope === "single_document") return [id];
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
    setScopeDirty(true);
  }

  function changeScope(value) {
    setScope(value);
    if (value === "all_documents") setSelectedIds([]);
    else if (value === "single_document" && selectedIds.length > 1) setSelectedIds(selectedIds.slice(0, 1));
    else if (value === "single_document" && selectedIds.length === 0 && readyDocs.length) setSelectedIds([readyDocs[0].id]);
    setScopeDirty(true);
  }

  async function createConversation() {
    setError(""); setNotice("");
    if (scope === "single_document" && selectedIds.length !== 1) { setError("Choose one completed document to start this session."); return; }
    if (scope === "selected_documents" && selectedIds.length === 0) { setError("Choose at least one completed document."); return; }
    setSavingScope(true);
    try {
      const result = await api.createConversation({ title: "Study session", retrieval_scope: scope, document_ids: scope === "all_documents" ? [] : selectedIds });
      await loadLists(); setSearchParams({ conversation: result.id });
    } catch (e) { setError(e.message); }
    finally { setSavingScope(false); }
  }

  async function saveScope() {
    if (scope === "single_document" && selectedIds.length !== 1) { setError("Choose one completed document."); return; }
    if (scope === "selected_documents" && selectedIds.length === 0) { setError("Choose at least one completed document."); return; }
    setSavingScope(true); setError(""); setNotice("");
    try {
      const updated = await api.updateConversation(activeId, { retrieval_scope: scope, document_ids: scope === "all_documents" ? [] : selectedIds });
      setDetail((current) => ({ ...current, ...updated })); setScope(updated.retrieval_scope); setSelectedIds(updated.document_ids || []);
      setScopeDirty(false); setScopeEditing(false); await loadLists(); setNotice("Document scope updated for future questions.");
    } catch (e) { setError(e.message); }
    finally { setSavingScope(false); }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !activeId || sending) return;
    setSending(true); setError(""); setNotice("");
    try {
      const result = await api.sendMessage(activeId, content);
      setMessages((current) => [...current, result.user_message, result.assistant_message]);
      setCitationMap((current) => ({ ...current, [result.assistant_message.id]: result.citations || [] }));
      setDraft(""); await loadLists();
    } catch (e) {
      // The API persists messages only after generation succeeds; preserve the displayed history on failure.
      setError(`${e.message} Your existing conversation is still here; you can retry your question.`);
    } finally { setSending(false); }
  }

  const noReadyDocs = readyDocs.length === 0;
  if (loading) return <LoadingState label="Opening your study space" />;

  return <>
    <div className="chat-page-heading"><div><span className="eyebrow">YOUR MATERIAL, YOUR QUESTIONS</span><h1>Study chat</h1><p>Ask, follow up, and keep every study session in your history.</p></div><button className="button button-dark button-small" onClick={() => { setSearchParams({}); setScope("single_document"); setSelectedIds(readyDocs[0] ? [readyDocs[0].id] : []); setError(""); }}><Icon name="plus" size={16} /> New session</button></div>
    <Alert>{error}</Alert><Alert tone="success" onDismiss={() => setNotice("")}>{notice}</Alert>
    <div className="chat-layout">
      <aside className="chat-list-panel">
        <Link className="chat-back-workspace" to="/app"><Icon name="arrow" size={15} /> Back to workspace</Link>
        <button className="new-session-button" onClick={() => { setSearchParams({}); setScope("single_document"); setSelectedIds(readyDocs[0] ? [readyDocs[0].id] : []); }}><Icon name="plus" size={17} /> Start a new session</button>
        <span className="chat-list-label">RECENT SESSIONS</span>
        <div className="chat-list-items">{conversations.length ? conversations.map((chat) => <button key={chat.id} className={`chat-list-item ${activeId === chat.id ? "chat-list-item-active" : ""}`} onClick={() => setSearchParams({ conversation: chat.id })}><span className="chat-list-icon"><Icon name="chat" size={16} /></span><span className="chat-list-copy"><strong>{chat.title}</strong><small>{formatDate(chat.updated_at)}</small></span></button>) : <p className="chat-list-empty">Your conversations will appear here.</p>}</div>
        <Link className="chat-list-footer" to="/app/conversations">Conversation history <Icon name="arrow" size={14} /></Link>
      </aside>

      <section className="chat-workspace">
        {!activeId ? <div className="new-chat-setup">
          <span className="setup-icon"><Icon name="spark" size={22} /></span><span className="eyebrow">A NEW STUDY SESSION</span><h2>What are we learning today?</h2><p>Choose which documents this conversation can use. You can change the scope later.</p>
          {noReadyDocs ? <EmptyState icon="files" title="Add a document first" description="A completed PDF gives your questions something to search." action={<Link to="/app/documents" className="button button-dark button-small"><Icon name="upload" size={16} /> Go to documents</Link>} /> : <>
            <ScopeOptions scope={scope} onScopeChange={changeScope} />
            <DocumentChoices documents={documents} scope={scope} selectedIds={selectedIds} onChange={toggleDocument} />
            <button className="button button-dark setup-submit" onClick={createConversation} disabled={savingScope}>{savingScope ? <><span className="spinner spinner-light" /> Creating session…</> : <>Create study session <Icon name="arrow" size={16} /></>}</button>
          </>}
        </div> : detailLoading ? <LoadingState label="Loading conversation" /> : detail ? <>
          <div className="active-chat-header"><div><span className="eyebrow">PERSISTENT STUDY SESSION</span><h2>{detail.title}</h2></div><button className="scope-summary" onClick={() => { setScopeEditing((value) => !value); setError(""); }}><span className="scope-summary-icon"><Icon name="files" size={15} /></span><span>{scopeCopy[detail.retrieval_scope]?.label || "Document scope"}</span><span className="scope-chevron">{scopeEditing ? "−" : "+"}</span></button></div>
          {scopeEditing && <div className="scope-editor"><ScopeOptions scope={scope} onScopeChange={changeScope} /><DocumentChoices documents={documents} scope={scope} selectedIds={selectedIds} onChange={toggleDocument} /><div className="scope-editor-actions"><button className="button button-light button-small" onClick={() => { setScope(detail.retrieval_scope); setSelectedIds(detail.document_ids || []); setScopeDirty(false); setScopeEditing(false); }}>Cancel</button><button className="button button-dark button-small" disabled={savingScope || !scopeDirty} onClick={saveScope}>{savingScope ? "Saving…" : "Save scope"}</button></div></div>}
          <div className="chat-evidence-note"><Icon name="check" size={14} /> {detail.retrieval_scope === "all_documents" ? `${readyDocs.length} completed ${readyDocs.length === 1 ? "document" : "documents"} in scope` : `${detail.document_ids.length} ${detail.document_ids.length === 1 ? "document" : "documents"} in scope`} · answers are grounded in retrieved pages</div>
          <div className="message-stream" aria-live="polite">
            {messages.length === 0 ? <div className="chat-welcome"><span className="welcome-spark"><Icon name="spark" size={22} /></span><h3>Let’s make this click.</h3><p>Ask about a concept, request a summary, or connect ideas across your selected material.</p><div className="prompt-chips"><button onClick={() => setDraft("Can you explain the main ideas in this material?")}>Explain the main ideas</button><button onClick={() => setDraft("What should I focus on when reviewing this document?")}>Help me review</button></div></div> : messages.map((message) => <article key={message.id} className={`message-row message-${message.role}`}><div className={`message-avatar message-avatar-${message.role}`}>{message.role === "assistant" ? <Icon name="spark" size={17} /> : "Y"}</div><div className="message-body"><div className="message-meta"><strong>{message.role === "assistant" ? "Study Buddy" : "You"}</strong><span>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}</span></div><div className="message-content">{message.role === "assistant" ? <MarkdownRenderer content={message.content} /> : message.content}</div>{message.role === "assistant" && citationMap[message.id]?.length > 0 && <div className="citation-list"><span className="citation-heading">SOURCES</span>{citationMap[message.id].map((citation) => <span className="citation-chip" key={`${citation.chunk_id}-${citation.document_id}`}><Icon name="book" size={13} /><span>{citation.source}</span>{citation.page_number ? <small>p. {citation.page_number}</small> : null}</span>)}</div>}</div></article>)}
            {sending && <div className="message-row message-assistant"><div className="message-avatar message-avatar-assistant"><Icon name="spark" size={17} /></div><div className="message-body"><div className="message-meta"><strong>Study Buddy</strong><span>Working from your material</span></div><div className="thinking-indicator"><span /><span /><span /></div></div></div>}
            <div ref={messageEndRef} />
          </div>
          <form className="chat-composer" onSubmit={sendMessage}><textarea aria-label="Ask a question" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} maxLength={10000} placeholder="Ask a question about your material…" disabled={sending} rows={2} /><div className="composer-footer"><span>Grounded answers can take a little while. Press Enter to send.</span><button className="send-button" type="submit" aria-label="Send question" disabled={sending || !draft.trim()}>{sending ? <span className="spinner spinner-light" /> : <Icon name="send" size={18} />}</button></div></form>
        </> : <EmptyState icon="chat" title="Conversation unavailable" description="It may have been deleted, or you may not have access to it." action={<button className="button button-dark button-small" onClick={() => setSearchParams({})}>Start a new session</button>} />}
      </section>
    </div>
  </>;
}
