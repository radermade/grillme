import { useEffect, useRef, type ReactNode } from "react";

export function Panel({ children, className = "", title }: { children: ReactNode; className?: string; title?: string }) {
  return <section className={`ui-panel ${className}`.trim()}>{title && <h2>{title}</h2>}{children}</section>;
}

export function StatusBadge({ tone, children }: { tone: "success" | "warning" | "error" | "info" | "neutral"; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}><span aria-hidden="true" className="status-dot" />{children}</span>;
}

export function CoachCallout({ tone = "info", title, children }: { tone?: "info" | "warning" | "tip" | "error"; title: string; children: ReactNode }) {
  return <aside className={`coach-callout ${tone}`}><strong>{title}</strong><div>{children}</div></aside>;
}

export function CodeSurface({ children, label = "Code or log output" }: { children: ReactNode; label?: string }) {
  return <div className="code-surface" role="region" aria-label={label}><div className="code-surface-bar"><span aria-hidden="true">● ● ●</span><span>{label}</span></div><pre><code>{children}</code></pre></div>;
}

export function ProgressMeter({ label, value, max }: { label: string; value: number; max: number }) {
  const safeMax = Math.max(1, max);
  return <div className="progress-meter"><div><span>{label}</span><span>{value}/{max}</span></div><progress aria-label={label} value={Math.min(value, safeMax)} max={safeMax} /></div>;
}

export function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: ReactNode }) {
  return <label className="ui-field"><span className="ui-field-label">{label}</span>{children}{help && <span className="ui-field-help">{help}</span>}{error && <span className="ui-field-error" role="alert">{error}</span>}</label>;
}

export function ResourceTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: Array<Array<ReactNode>> }) {
  return <div className="resource-table-wrap"><table className="resource-table"><caption>{caption}</caption><thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export function CommandBar({ children, label = "Actions" }: { children: ReactNode; label?: string }) {
  return <div className="command-bar" role="group" aria-label={label}>{children}</div>;
}

export function ApplicationRail({ children }: { children: ReactNode }) {
  return <nav className="application-rail" aria-label="Learning workspace">{children}</nav>;
}

export function SplitPane({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  return <div className="split-pane"><div>{primary}</div><aside>{secondary}</aside></div>;
}

export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title"><h2 id="dialog-title">{title}</h2>{children}<button className="secondary" onClick={onClose}>Close</button></dialog>;
}
