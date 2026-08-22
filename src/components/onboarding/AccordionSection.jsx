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

  const headerId = `ob-acc-header-${id}`
  const panelId = `ob-section-${id}`

  return (
    <section
      id={`ob-sec-${id}`}
      className={`ob-accordion ${open ? 'open' : ''} tone-${tone}`}
      data-search={searchText || title}
    >
      <h3 className="ob-acc-heading">
        <button
          type="button"
          id={headerId}
          className="ob-accordion-header"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(id)}
        >
          <div className="ob-acc-left">
            {Icon && (
              <div className={`ob-acc-icon ${iconTone}`} aria-hidden="true">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="ob-acc-copy">
              <div className="ob-acc-title-row">
                <span className="ob-acc-title">{title}</span>
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
            <div className={`ob-accordion-chevron-wrap ${open ? 'open' : ''}`} aria-hidden="true">
              <ChevronDown size={16} className="ob-accordion-chevron" />
            </div>
          </div>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!open}
        className="ob-accordion-body"
      >
        {open ? children : null}
      </div>
    </section>
  )
}
