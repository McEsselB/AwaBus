import styles from './UI.module.css'

/* ── Button ── */
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${styles[`btn_${size}`]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

/* ── Badge ── */
export function Badge({ children, color = 'gray' }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${color}`]}`}>
      {children}
    </span>
  )
}

/* ── Status dot ── */
export function StatusDot({ status }) {
  const map = {
    active: 'green',
    suspended: 'red',
    deleted: 'gray',
    'Active Trip': 'green',
    Idle: 'gray',
    Maintenance: 'amber',
  }
  const color = map[status] ?? 'gray'
  return (
    <span className={`${styles.statusDot} ${styles[`dot_${color}`]}`} />
  )
}

/* ── Table ── */
export function Table({ children }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>{children}</table>
    </div>
  )
}

export function Th({ children, width }) {
  return <th className={styles.th} style={width ? { width } : undefined}>{children}</th>
}

export function Td({ children, muted }) {
  return <td className={`${styles.td} ${muted ? styles.tdMuted : ''}`}>{children}</td>
}

export function Tr({ children, onClick }) {
  return (
    <tr className={`${styles.tr} ${onClick ? styles.trClickable : ''}`} onClick={onClick}>
      {children}
    </tr>
  )
}

/* ── Input ── */
export function Input({ label, id, error, ...props }) {
  return (
    <div className={styles.fieldGroup}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <input id={id} className={`${styles.input} ${error ? styles.inputError : ''}`} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

/* ── Select ── */
export function Select({ label, id, error, children, ...props }) {
  return (
    <div className={styles.fieldGroup}>
      {label && <label className={styles.label} htmlFor={id}>{label}</label>}
      <select id={id} className={`${styles.select} ${error ? styles.inputError : ''}`} {...props}>
        {children}
      </select>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  )
}

/* ── Empty state ── */
export function Empty({ message = 'Nothing here yet.' }) {
  return (
    <div className={styles.empty}>
      <span>{message}</span>
    </div>
  )
}

/* ── Spinner ── */
export function Spinner() {
  return <div className={styles.spinner} aria-label="Loading" />
}

/* ── Search input ── */
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className={styles.searchWrap}>
      <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        className={styles.searchInput}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}