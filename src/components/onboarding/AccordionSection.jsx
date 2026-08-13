import { ChevronDown } from 'lucide-react'

export default function AccordionSection({
  id,
  title,
  open,
  onToggle,
  icon: Icon,
  iconTone = 'indigo',
  subtitle,
  badge,
  summary,
  tone = 'default',
  children,
  searchText,
  hidden = false,
}) {
  if (hidden) return null

  return (
    <section
      id={`ob-sec-${id}`}
      className={`ob-accordion ${open ? 'open' : ''} tone-${tone}`}
      data-search={searchText || title}
    >
      <button
        type="button"
        className="ob-accordion-header"
        aria-expanded={open}
        aria-controls={`ob-section-${id}`}
        onClick={() => onToggle(id)}
      >
        <div className="ob-acc-left">
          {Icon && (
            <div className={`ob-acc-icon ${iconTone}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="ob-acc-copy">
            <div className="ob-acc-title-row">
              <h3>{title}</h3>
              {badge && (
                <span className={`ob-acc-badge ${badge.tone || 'slate'}`}>
                  {badge.label}
                </span>
              )}
            </div>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        <div className="ob-acc-right">
          {summary && <span className="ob-acc-summary">{summary}</span>}
          <div className={`ob-accordion-chevron-wrap ${open ? 'open' : ''}`}>
            <ChevronDown size={16} className="ob-accordion-chevron" />
          </div>
        </div>
      </button>
      {open && (
        <div id={`ob-section-${id}`} className="ob-accordion-body">
          {children}
        </div>
      )}
    </section>
  )
}
