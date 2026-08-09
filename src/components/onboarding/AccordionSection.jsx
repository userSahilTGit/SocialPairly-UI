import { ChevronDown } from 'lucide-react'

export default function AccordionSection({ id, title, open, onToggle, children }) {
  return (
    <section className={`ob-accordion ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="ob-accordion-header"
        aria-expanded={open}
        aria-controls={`ob-section-${id}`}
        onClick={() => onToggle(id)}
      >
        <span>{title}</span>
        <ChevronDown size={18} className="ob-accordion-chevron" />
      </button>
      {open && (
        <div id={`ob-section-${id}`} className="ob-accordion-body">
          {children}
        </div>
      )}
    </section>
  )
}
