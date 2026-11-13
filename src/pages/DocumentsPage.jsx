import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import Icon from "../components/Icon";
import { Alert, EmptyState, LoadingState, PageHeading, StatusPill, formatDate } from "../components/UI";

const MAX_UPLOAD_BYTES = Number(import.meta.env.VITE_MAX_PDF_UPLOAD_BYTES) || 25 * 1024 * 1024;
const readableSize = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    const result = await api.documents();
    setDocuments(result);
  }, []);

  useEffect(() => {
    let active = true;
    api.documents().then((items) => { if (active) setDocuments(items); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!documents.some((doc) => ["pending", "processing"].includes(doc.status))) return undefined;
    const timer = window.setInterval(() => loadDocuments().catch((e) => setError(e.message)), 4000);
    return () => window.clearInterval(timer);
  }, [documents, loadDocuments]);

  async function uploadFile(file) {
    setError(""); setNotice("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      setError("Choose a PDF file to add it to your library."); return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`This PDF is too large. The upload limit is ${readableSize(MAX_UPLOAD_BYTES)}.`); return;
    }
    setBusy(true); setProgress(0);
    try {
      const uploaded = await api.uploadDocument(file, setProgress);
      await loadDocuments();
      if (uploaded.status === "failed") setError("The PDF was saved, but processing failed. You can retry it from the document list.");
      else setNotice(`${uploaded.filename} was added to your library.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false); setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function retryDocument(document) {
    setRetrying(document.id); setError(""); setNotice("");
    try {
      const updated = await api.retryDocument(document.id);
      setDocuments((items) => items.map((item) => item.id === updated.id ? updated : item));
      if (updated.status === "completed") setNotice(`${updated.filename} is ready to study.`);
      else setError("Processing did not complete. You can try again later.");
    } catch (requestError) { setError(requestError.message); }
    finally { setRetrying(""); }
  }

  async function deleteDocument() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setRetrying(target.id); setError(""); setNotice("");
    try {
      await api.deleteDocument(target.id);
      setDocuments((items) => items.filter((item) => item.id !== target.id));
      setNotice(`${target.filename} and its indexed content were deleted.`);
    } catch (requestError) { setError(requestError.message); }
    finally { setRetrying(""); setPendingDelete(null); }
  }

  return <>
    <PageHeading eyebrow="YOUR PRIVATE LIBRARY" title="My documents" description="Add course PDFs, check their processing status, and choose what your study conversations can use." action={<><input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,application/pdf" onChange={(event) => uploadFile(event.target.files?.[0])} /><button className="button button-dark" disabled={busy} onClick={() => inputRef.current?.click()}><Icon name="upload" size={17} /> {busy ? "Uploading…" : "Upload PDF"}</button></>} />
    <Alert>{error}</Alert><Alert tone="success" onDismiss={() => setNotice("")}>{notice}</Alert>
    {busy && <div className="upload-progress"><div className="upload-progress-top"><span>{progress < 100 ? "Uploading your PDF" : "Processing your PDF"}</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${Math.max(4, progress)}%` }} /></div><small>Keep this page open while the document is being added.</small></div>}
    <section className="library-card">
      <div className="library-card-head"><div><span className="eyebrow">DOCUMENT LIBRARY</span><h2>{documents.length} {documents.length === 1 ? "document" : "documents"}</h2></div><span className="privacy-chip"><Icon name="check" size={14} /> Private to you</span></div>
      {loading ? <LoadingState label="Loading documents" /> : documents.length === 0 ? <EmptyState icon="files" title="A place for your course material" description="Upload a PDF to make it available as evidence in your study conversations." action={<button className="button button-dark button-small" onClick={() => inputRef.current?.click()}><Icon name="upload" size={16} /> Choose a PDF</button>} /> : <div className="document-list">
        {documents.map((doc) => <article className="document-row" key={doc.id}>
          <span className="document-file-icon"><Icon name="files" size={21} /></span>
          <div className="document-main"><strong title={doc.filename}>{doc.filename}</strong><span>Added {formatDate(doc.created_at)} <i /> PDF document</span>{doc.status === "failed" && <small className="inline-help">Processing failed. Retry when your connection or provider is available.</small>}</div>
          <StatusPill status={doc.status} />
          <div className="document-actions">{doc.status === "failed" && <button className="icon-button action-retry" aria-label={`Retry ${doc.filename}`} title="Retry processing" disabled={retrying === doc.id} onClick={() => retryDocument(doc)}>{retrying === doc.id ? <span className="spinner" /> : <Icon name="retry" size={18} />}</button>}<button className="icon-button action-delete" aria-label={`Delete ${doc.filename}`} title="Delete document" disabled={retrying === doc.id} onClick={() => setPendingDelete(doc)}><Icon name="trash" size={18} /></button></div>
        </article>)}
      </div>}
    </section>
    <div className="library-tip"><span className="tip-mark"><Icon name="spark" size={16} /></span><span><strong>Tip for better answers</strong> Use clear, text-based PDFs. Scanned image PDFs may not contain text that can be searched.</span></div>
    {pendingDelete && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><span className="modal-icon modal-icon-danger"><Icon name="trash" size={21} /></span><h2 id="delete-title">Delete this document?</h2><p><strong>{pendingDelete.filename}</strong> and its indexed content will be removed. Existing conversations will stay in your history.</p><div className="modal-actions"><button className="button button-light" onClick={() => setPendingDelete(null)}>Keep document</button><button className="button button-danger" onClick={deleteDocument} disabled={retrying === pendingDelete.id}>{retrying === pendingDelete.id ? "Deleting…" : "Delete document"}</button></div></section></div>}
    <div className="page-bottom-link"><Link to="/app/chat"><Icon name="spark" size={16} /> Ready to ask a question? Start a study chat <Icon name="arrow" size={15} /></Link></div>
  </>;
}
