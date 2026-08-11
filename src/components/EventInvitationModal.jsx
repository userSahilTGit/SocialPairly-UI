import { getMediaUrl } from '../utils/mediaUrl'
import { Check, X } from 'lucide-react'
import './EventInvitationModal.css'

function formatDateTime(dateStr, timeStr) {
    if (!dateStr) return ''
    const time = timeStr ? String(timeStr).slice(0, 5) : ''
    return `${dateStr} at ${time}`
}

export default function EventInvitationModal({ open, invitation, loading, onAccept, onDecline, onClose }) {
    if (!open) return null

    if (!invitation) {
        return (
            <div className="event-invite-overlay" onClick={onClose}>
                <div className="event-invite-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="event-invite-body" style={{ textAlign: 'center', padding: 48 }}>
                        {loading ? 'Loading invitation...' : 'Unable to load invitation'}
                    </div>
                </div>
            </div>
        )
    }

    const perksText = (invitation.eventPerks || []).join(', ')
    const previews = invitation.memberPreviews || []
    const visiblePreviews = previews.slice(0, 5)
    const overflow = previews.length - visiblePreviews.length

    return (
        <div className="event-invite-overlay" onClick={onClose}>
            <div className="event-invite-modal" onClick={(e) => e.stopPropagation()}>
                <div className="event-invite-header">
                    <span className="event-invite-tag">NEW GROUP MATCH INVITATION</span>
                    <h2>{invitation.title}</h2>
                    <p>You&apos;ve been selected by SocialPairly admin for an upcoming group event!</p>
                </div>

                <div className="event-invite-body">
                    <div className="event-invite-details">
                        <div className="event-invite-detail-row">
                            <label>Venue Location</label>
                            <p>{invitation.venueName}, {invitation.location}</p>
                        </div>
                        <div className="event-invite-detail-row">
                            <label>Date &amp; Time</label>
                            <p>{formatDateTime(invitation.eventDate, invitation.eventTime)}</p>
                        </div>
                        <div className="event-invite-detail-row">
                            <label>Requirements</label>
                            <p>{perksText || '—'}</p>
                        </div>
                    </div>

                    <div className="event-invite-members">
                        <div className="event-invite-members-head">
                            <strong>Group Members Preview</strong>
                            <span>{invitation.memberCount} Members Matched</span>
                        </div>
                        <div className="event-invite-avatars">
                            {visiblePreviews.map((m) => (
                                <div key={m.userId} className="event-invite-avatar">
                                    {m.profilePhotoUrl ? (
                                        <img src={getMediaUrl(m.profilePhotoUrl)} alt="" />
                                    ) : (
                                        m.initial
                                    )}
                                </div>
                            ))}
                            {overflow > 0 && (
                                <div className="event-invite-avatar overflow">+{overflow}</div>
                            )}
                        </div>
                        <p className="event-invite-unlock-note">
                            <em>Full attendee profiles &amp; reaction tokens unlocked upon accepting your invitation.</em>
                        </p>
                    </div>

                    <div className="event-invite-actions">
                        <button type="button" className="event-invite-decline" disabled={loading} onClick={onDecline}>
                            <X size={14} /> Decline
                        </button>
                        <button type="button" className="event-invite-accept" disabled={loading} onClick={onAccept}>
                            <Check size={14} /> {loading ? 'Accepting...' : 'Accept Invitation'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
