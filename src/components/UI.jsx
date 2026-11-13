import Icon from "./Icon";

export function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}

export function StatusPill({ status }) {
  const label = { pending: "Pending", processing: "Processing", completed: "Ready", failed: "Needs attention" }[status] || status;
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{label}</span>;
}

export function Alert({ children, tone = "error", onDismiss }) {
  if (!children) return null;
  return <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}><span>{children}</span>{onDismiss && <button className="alert-close" onClick={onDismiss} aria-label="Dismiss"><Icon name="close" size={16} /></button>}</div>;
}

export function LoadingState({ label = "Loading your workspace" }) {
  return <div className="loading-state" role="status"><span className="spinner" /><span>{label}</span></div>;
}

export function EmptyState({ icon = "book", title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={25} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function formatDate(value) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
