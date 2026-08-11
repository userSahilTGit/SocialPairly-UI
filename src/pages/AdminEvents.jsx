import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { getMediaUrl } from '../utils/mediaUrl'
import {
    Bookmark,
    Calendar,
    CalendarPlus,
    Check,
    ChevronDown,
    ClipboardList,
    Heart,
    Megaphone,
    Pencil,
    Plus,
    Search,
    Send,
    SlidersHorizontal,
    Trash2,
    Users,
    X,
} from 'lucide-react'
import './AdminEvents.css'

const EMPTY_FORM = {
    title: '',
    description: '',
    location: '',
    venueName: '',
    eventDate: '',
    eventTime: '',
    stateCode: '',
    fipsCode: '',
    eventPerks: [],
}

const EMPTY_FILTERS = {
    gender: '',
    religion: '',
    minAge: '',
    maxAge: '',
    location: '',
    profession: '',
    educationLevel: '',
    maritalStatus: '',
    verifiedOnly: false,
}

function parseEventCode(eventCode) {
    if (!eventCode) return { stateCode: '', fipsCode: '' }
    const parts = eventCode.split('-')
    if (parts.length >= 3) {
        return { stateCode: parts[0], fipsCode: parts[1] }
    }
    return { stateCode: '', fipsCode: '' }
}

function formatEventDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(dateStr, timeStr) {
    if (!dateStr) return ''
    const time = timeStr ? timeStr.slice(0, 5) : ''
    return `${dateStr} at ${time}`
}

function buildPayload(form, memberIds, notifyParticipants = false) {
    const allPerks = [...new Set(form.eventPerks || [])]

    return {
        title: form.title,
        description: form.description || null,
        venueName: form.venueName,
        location: form.location,
        eventDate: form.eventDate,
        eventTime: form.eventTime.length === 5 ? `${form.eventTime}:00` : form.eventTime,
        stateCode: form.stateCode.toUpperCase(),
        fipsCode: form.fipsCode,
        eventPerks: allPerks,
        memberUserIds: memberIds,
        notifyParticipants,
    }
}

function hasActiveFilters(filters) {
    return Boolean(
        filters.gender || filters.religion || filters.minAge || filters.maxAge
        || filters.location || filters.profession || filters.educationLevel
        || filters.maritalStatus || filters.verifiedOnly
    )
}

export default function AdminEvents() {
    const [activeTab, setActiveTab] = useState('manage')
    const [stats, setStats] = useState(null)
    const [events, setEvents] = useState([])
    const [totalEventCount, setTotalEventCount] = useState(0)
    const [listFilter, setListFilter] = useState('all')
    const [selectedEventId, setSelectedEventId] = useState(null)
    const [eventDetail, setEventDetail] = useState(null)
    const [perksOptions, setPerksOptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    const [builderMode, setBuilderMode] = useState('create')
    const [editingEventId, setEditingEventId] = useState(null)
    const [editingEventStatus, setEditingEventStatus] = useState(null)
    const [liveNotificationActive, setLiveNotificationActive] = useState(false)
    const [form, setForm] = useState({ ...EMPTY_FORM, customPerksText: '' })
    const [selectedMembers, setSelectedMembers] = useState(new Set())
    const [perksDropdownOpen, setPerksDropdownOpen] = useState(false)

    const [candidateQuery, setCandidateQuery] = useState('')
    const [candidateFilters, setCandidateFilters] = useState(EMPTY_FILTERS)
    const [filterDraft, setFilterDraft] = useState(EMPTY_FILTERS)
    const [filterPopupOpen, setFilterPopupOpen] = useState(false)
    const [candidates, setCandidates] = useState([])
    const [candidatesLoading, setCandidatesLoading] = useState(false)

    const [verifyCodes, setVerifyCodes] = useState({})
    const [verifyLoading, setVerifyLoading] = useState({})

    const loadStats = useCallback(async () => {
        const res = await api.get('/admin/events/stats')
        setStats(res.data)
    }, [])

    const loadEvents = useCallback(async (filter = listFilter) => {
        const res = await api.get('/admin/events', { params: { status: filter } })
        setEvents(res.data)
        return res.data
    }, [listFilter])

    const loadEventDetail = useCallback(async (id) => {
        const res = await api.get(`/admin/events/${id}`)
        setEventDetail(res.data)
    }, [])

    const loadCandidates = useCallback(async () => {
        setCandidatesLoading(true)
        try {
            const params = {
                query: candidateQuery || undefined,
                verifiedOnly: candidateFilters.verifiedOnly || undefined,
                gender: candidateFilters.gender || undefined,
                religion: candidateFilters.religion || undefined,
                minAge: candidateFilters.minAge || undefined,
                maxAge: candidateFilters.maxAge || undefined,
                location: candidateFilters.location || undefined,
                profession: candidateFilters.profession || undefined,
                educationLevel: candidateFilters.educationLevel || undefined,
                maritalStatus: candidateFilters.maritalStatus || undefined,
            }
            const res = await api.get('/admin/events/candidates', { params })
            setCandidates(res.data)
        } catch {
            setCandidates([])
        } finally {
            setCandidatesLoading(false)
        }
    }, [candidateQuery, candidateFilters])

    useEffect(() => {
        const init = async () => {
            try {
                const [, perksRes] = await Promise.all([
                    loadStats(),
                    api.get('/admin/events/perks'),
                ])
                setPerksOptions(perksRes.data)
                const eventList = await loadEvents('all')
                setTotalEventCount(eventList.length)
                if (eventList.length > 0) {
                    setSelectedEventId(eventList[0].id)
                }
            } catch {
                setMessage({ type: 'error', text: 'Failed to load events dashboard' })
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [loadStats, loadEvents])

    useEffect(() => {
        if (selectedEventId) {
            loadEventDetail(selectedEventId).catch(() => setEventDetail(null))
        }
    }, [selectedEventId, loadEventDetail])

    useEffect(() => {
        loadEvents(listFilter).catch(() => {})
    }, [listFilter, loadEvents])

    useEffect(() => {
        if (activeTab === 'builder') {
            loadCandidates()
        }
    }, [activeTab, loadCandidates])

    const filteredEventsCount = useMemo(() => totalEventCount, [totalEventCount])

    const openCreateBuilder = () => {
        setBuilderMode('create')
        setEditingEventId(null)
        setEditingEventStatus(null)
        setLiveNotificationActive(false)
        setForm({ ...EMPTY_FORM, customPerksText: '' })
        setSelectedMembers(new Set())
        setCandidateQuery('')
        setCandidateFilters(EMPTY_FILTERS)
        setFilterDraft(EMPTY_FILTERS)
        setPerksDropdownOpen(false)
        setMessage({ type: '', text: '' })
        setActiveTab('builder')
    }

    const openEditBuilder = (detail) => {
        const { stateCode, fipsCode } = parseEventCode(detail.eventCode)
        setBuilderMode('edit')
        setEditingEventId(detail.id)
        setEditingEventStatus(detail.status)
        setForm({
            title: detail.title,
            description: detail.description || '',
            location: detail.location,
            venueName: detail.venueName,
            eventDate: detail.eventDate,
            eventTime: detail.eventTime?.slice(0, 5) || '',
            stateCode,
            fipsCode,
            eventPerks: [...(detail.eventPerks || [])],
            customPerksText: '',
        })
        setSelectedMembers(new Set(detail.participants.map((p) => p.userId)))
        setMessage({ type: '', text: '' })
        setActiveTab('builder')
    }

    const clearCandidateFilters = () => {
        setCandidateFilters(EMPTY_FILTERS)
        setFilterDraft(EMPTY_FILTERS)
    }

    const applyFilterDraft = () => {
        setCandidateFilters({ ...filterDraft })
        setFilterPopupOpen(false)
    }

    const toggleMember = (userId) => {
        setSelectedMembers((prev) => {
            const next = new Set(prev)
            if (next.has(userId)) next.delete(userId)
            else next.add(userId)
            return next
        })
    }

    const togglePerk = (perk) => {
        setForm((prev) => {
            const perks = prev.eventPerks.includes(perk)
                ? prev.eventPerks.filter((p) => p !== perk)
                : [...prev.eventPerks, perk]
            return { ...prev, eventPerks: perks }
        })
    }

    const customPerksInList = useMemo(
        () => form.eventPerks.filter((perk) => !perksOptions.includes(perk)),
        [form.eventPerks, perksOptions],
    )

    const addCustomPerks = () => {
        const newPerks = (form.customPerksText || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        if (newPerks.length === 0) return
        setForm((prev) => ({
            ...prev,
            eventPerks: [...new Set([...prev.eventPerks, ...newPerks])],
            customPerksText: '',
        }))
    }

    const cancelCustomPerks = () => {
        setForm((prev) => ({ ...prev, customPerksText: '' }))
    }

    const validateForm = () => {
        if (!form.title.trim()) return 'Event title is required'
        if (!form.location.trim()) return 'Location is required'
        if (!form.venueName.trim()) return 'Venue name is required'
        if (!form.eventDate) return 'Event date is required'
        if (!form.eventTime) return 'Event time is required'
        if (!/^[A-Za-z]{2}$/.test(form.stateCode.trim())) return 'State code must be 2 letters'
        if (!/^\d{5}$/.test(form.fipsCode.trim())) return 'FIPS code must be 5 digits'
        if (selectedMembers.size === 0) return 'Select at least one member'
        return null
    }

    const refreshAfterSave = async (eventId) => {
        await Promise.all([loadStats(), loadEvents(listFilter)])
        const allRes = await api.get('/admin/events', { params: { status: 'all' } })
        setTotalEventCount(allRes.data.length)
        setSelectedEventId(eventId)
        await loadEventDetail(eventId)
        setActiveTab('manage')
    }

    const handleSaveDraft = async () => {
        if (editingEventStatus === 'published') return
        const error = validateForm()
        if (error) {
            setMessage({ type: 'error', text: error })
            return
        }
        setSaving(true)
        setMessage({ type: '', text: '' })
        try {
            const payload = buildPayload(form, [...selectedMembers], false)
            let eventId = editingEventId
            if (builderMode === 'edit' && editingEventId) {
                await api.put(`/admin/events/${editingEventId}`, payload)
            } else {
                const res = await api.post('/admin/events', payload)
                eventId = res.data.id
            }
            setMessage({ type: 'success', text: 'Event saved as draft' })
            await refreshAfterSave(eventId)
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save draft' })
        } finally {
            setSaving(false)
        }
    }

    const handleSaveChanges = async () => {
        const error = validateForm()
        if (error) {
            setMessage({ type: 'error', text: error })
            return
        }
        setSaving(true)
        setMessage({ type: '', text: '' })
        try {
            const payload = buildPayload(form, [...selectedMembers], liveNotificationActive)
            await api.put(`/admin/events/${editingEventId}`, payload)
            const msg = liveNotificationActive
                ? 'Event updated — notification emails sent to participants'
                : 'Event updated successfully'
            setMessage({ type: 'success', text: msg })
            setLiveNotificationActive(false)
            await refreshAfterSave(editingEventId)
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save changes' })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteDraft = async (eventId) => {
        if (!window.confirm('Delete this draft event? This cannot be undone.')) return
        setSaving(true)
        try {
            await api.delete(`/admin/events/${eventId}`)
            setMessage({ type: 'success', text: 'Draft event deleted' })
            setSelectedEventId(null)
            setEventDetail(null)
            await Promise.all([loadStats(), loadEvents(listFilter)])
            const allRes = await api.get('/admin/events', { params: { status: 'all' } })
            setTotalEventCount(allRes.data.length)
            setActiveTab('manage')
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete draft' })
        } finally {
            setSaving(false)
        }
    }

    const handlePublish = async () => {
        const error = validateForm()
        if (error) {
            setMessage({ type: 'error', text: error })
            return
        }
        setSaving(true)
        setMessage({ type: '', text: '' })
        try {
            const payload = buildPayload(form, [...selectedMembers], false)
            let eventId = editingEventId
            if (builderMode === 'edit' && editingEventId) {
                await api.put(`/admin/events/${editingEventId}`, payload)
            } else {
                const res = await api.post('/admin/events', payload)
                eventId = res.data.id
            }
            await api.post(`/admin/events/${eventId}/publish`)
            setMessage({ type: 'success', text: 'Event published — invitation emails sent' })
            await refreshAfterSave(eventId)
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to publish event' })
        } finally {
            setSaving(false)
        }
    }

    const handleVerifyCode = async (userId) => {
        const code = verifyCodes[userId]
        if (!code?.trim()) return
        setVerifyLoading((prev) => ({ ...prev, [userId]: true }))
        try {
            await api.post(`/admin/events/${selectedEventId}/participants/${userId}/verify`, {
                entryCode: code.trim(),
            })
            await loadEventDetail(selectedEventId)
            setVerifyCodes((prev) => ({ ...prev, [userId]: '' }))
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Verification failed' })
        } finally {
            setVerifyLoading((prev) => ({ ...prev, [userId]: false }))
        }
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="admin-events-page">
                    <div className="admin-events-container">
                        <div className="events-empty-state">Loading events dashboard...</div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Navbar />
            <div className="admin-events-page">
                <div className="admin-events-container">
                    <div className="admin-events-header">
                        <div>
                            <div className="breadcrumb-tag">Event Management</div>
                            <h1>Admin Dashboard &amp; Event Builder</h1>
                            <p>Create groups, organize matched events, assign members, and manage invitations.</p>
                        </div>
                        <button type="button" className="btn-dashboard-action" onClick={openCreateBuilder}>
                            <Plus size={16} style={{ marginRight: 6 }} />
                            Create New Event
                        </button>
                    </div>

                    {message.text && (
                        <div className={`events-alert ${message.type}`}>{message.text}</div>
                    )}

                    <div className="events-stats-grid">
                        <div className="events-stat-card">
                            <div className="events-stat-icon purple"><Users size={22} /></div>
                            <div>
                                <div className="events-stat-label">Total Users</div>
                                <div className="events-stat-value">{stats?.totalUsers ?? 0}</div>
                            </div>
                        </div>
                        <div className="events-stat-card">
                            <div className="events-stat-icon green"><Calendar size={22} /></div>
                            <div>
                                <div className="events-stat-label">Published Events</div>
                                <div className="events-stat-value">{stats?.publishedEvents ?? 0}</div>
                            </div>
                        </div>
                        <div className="events-stat-card">
                            <div className="events-stat-icon orange"><ClipboardList size={22} /></div>
                            <div>
                                <div className="events-stat-label">Draft Events</div>
                                <div className="events-stat-value">{stats?.draftEvents ?? 0}</div>
                            </div>
                        </div>
                        <div className="events-stat-card">
                            <div className="events-stat-icon pink"><Heart size={22} /></div>
                            <div>
                                <div className="events-stat-label">Accepted Members</div>
                                <div className="events-stat-value">{stats?.acceptedMembers ?? 0}</div>
                            </div>
                        </div>
                    </div>

                    <div className="events-tabs">
                        <button
                            type="button"
                            className={`events-tab ${activeTab === 'manage' ? 'active' : ''}`}
                            onClick={() => setActiveTab('manage')}
                        >
                            <ClipboardList size={16} />
                            Manage Events &amp; Groups
                            <span className="events-tab-count">( {filteredEventsCount} )</span>
                        </button>
                        <button
                            type="button"
                            className={`events-tab ${activeTab === 'builder' ? 'active' : ''}`}
                            onClick={() => activeTab !== 'builder' && openCreateBuilder()}
                        >
                            <CalendarPlus size={16} />
                            Event Builder Studio
                        </button>
                    </div>

                    {activeTab === 'manage' && (
                        <div className="events-manage-layout">
                            <div className="events-sidebar">
                                <div className="events-sidebar-header">
                                    <h3>All Created Events</h3>
                                    <span className="events-live-badge">Live Real-time</span>
                                </div>
                                <div className="events-filter-chips">
                                    {['all', 'published', 'draft'].map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            className={`events-filter-chip ${listFilter === f ? 'active' : ''}`}
                                            onClick={() => setListFilter(f)}
                                        >
                                            {f === 'all' ? 'All' : f === 'published' ? 'Published' : 'Drafts'}
                                        </button>
                                    ))}
                                </div>
                                <div className="events-list">
                                    {events.length === 0 && (
                                        <div className="events-empty-state">No events yet. Create your first event.</div>
                                    )}
                                    {events.map((ev) => (
                                        <div
                                            key={ev.id}
                                            className={`events-list-item ${selectedEventId === ev.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedEventId(ev.id)}
                                        >
                                            <div className="events-list-item-top">
                                                <span className={`events-status-badge ${ev.status}`}>{ev.status}</span>
                                                <span className="events-list-date">{formatEventDate(ev.eventDate)}</span>
                                            </div>
                                            <p className="events-list-title">{ev.title}</p>
                                            <div className="events-list-meta">
                                                <span>{ev.memberCount} Members</span>
                                                <span className="confirmed">{ev.confirmedCount} Confirmed</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="events-detail-panel">
                                {!eventDetail ? (
                                    <div className="events-empty-state">Select an event to view details</div>
                                ) : (
                                    <>
                                        <div className="events-detail-header">
                                            <div>
                                                <div className="events-detail-badges">
                                                    <span className={`events-status-badge ${eventDetail.status}`}>
                                                        {eventDetail.status}
                                                    </span>
                                                    <span className="events-detail-id">ID: evt-{eventDetail.id}</span>
                                                </div>
                                                <h2 className="events-detail-title">{eventDetail.title}</h2>
                                            </div>
                                            <div className="events-detail-actions">
                                                {(eventDetail.status === 'draft' || eventDetail.status === 'published') && (
                                                    <button
                                                        type="button"
                                                        className="btn-event-edit"
                                                        onClick={() => openEditBuilder(eventDetail)}
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                )}
                                                {eventDetail.status === 'draft' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn-events-delete"
                                                            disabled={saving}
                                                            onClick={() => handleDeleteDraft(eventDetail.id)}
                                                        >
                                                            <Trash2 size={14} /> Delete Draft
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-events-publish btn-events-publish-sm"
                                                            disabled={saving}
                                                            onClick={async () => {
                                                                setSaving(true)
                                                                try {
                                                                    await api.post(`/admin/events/${eventDetail.id}/publish`)
                                                                    setMessage({ type: 'success', text: 'Event published — invitation emails sent' })
                                                                    await refreshAfterSave(eventDetail.id)
                                                                } catch (err) {
                                                                    setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to publish' })
                                                                } finally {
                                                                    setSaving(false)
                                                                }
                                                            }}
                                                        >
                                                            <Send size={14} /> Publish
                                                        </button>
                                                    </>
                                                )}
                                                {eventDetail.status === 'published' && (
                                                    <button
                                                        type="button"
                                                        className={`btn-event-notify ${liveNotificationActive ? 'active' : ''}`}
                                                        onClick={() => setLiveNotificationActive((v) => !v)}
                                                    >
                                                        <Megaphone size={14} />
                                                        {liveNotificationActive ? 'Live Notification Active' : 'Enable Live Notification'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="events-info-grid">
                                            <div className="events-info-box">
                                                <label>Location &amp; Venue</label>
                                                <p>{eventDetail.venueName}, {eventDetail.location}</p>
                                            </div>
                                            <div className="events-info-box">
                                                <label>Date &amp; Time</label>
                                                <p>{formatDateTime(eventDetail.eventDate, eventDetail.eventTime)}</p>
                                            </div>
                                            <div className="events-info-box">
                                                <label>Assigned Members</label>
                                                <p>{eventDetail.memberCount} Total Users</p>
                                            </div>
                                        </div>

                                        {eventDetail.eventPerks?.length > 0 && (
                                            <div className="events-perks-section">
                                                <h4>Venue Requirements</h4>
                                                <div className="events-perk-tags">
                                                    {eventDetail.eventPerks.map((perk) => (
                                                        <span key={perk} className="events-perk-tag">
                                                            <Check size={14} /> {perk}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="events-members-section">
                                            <h4>Group Members &amp; Live Response Status</h4>
                                            <p className="events-members-note">User updates reflect live.</p>
                                            {eventDetail.participants.map((p) => (
                                                <div key={p.id}>
                                                    <div className="events-member-row">
                                                        <div className="events-member-avatar">
                                                            {p.profilePhotoUrl ? (
                                                                <img src={getMediaUrl(p.profilePhotoUrl)} alt="" />
                                                            ) : (
                                                                p.displayName?.[0]?.toUpperCase() || '?'
                                                            )}
                                                        </div>
                                                        <div className="events-member-info">
                                                            <div className="events-member-name">{p.displayName}</div>
                                                            <div className="events-member-code">{p.participantCode}</div>
                                                            <div className="events-member-sub">{p.occupation || '—'}</div>
                                                        </div>
                                                        <span className={`events-rsvp-badge ${p.rsvpStatus}`}>
                                                            {p.rsvpStatus === 'checked_in' ? 'Checked In' : p.rsvpStatus}
                                                        </span>
                                                    </div>
                                                    {eventDetail.status === 'published' && (
                                                        <div className="events-verify-row">
                                                            {p.verificationStatus === 'Done' ? (
                                                                <span className="events-verify-done">✔ Verified at entry</span>
                                                            ) : p.rsvpStatus === 'accepted' || p.rsvpStatus === 'checked_in' ? (
                                                                <>
                                                                    <input
                                                                        type="text"
                                                                        className="events-verify-input"
                                                                        placeholder="Enter check-in code..."
                                                                        value={verifyCodes[p.userId] || ''}
                                                                        onChange={(e) => setVerifyCodes((prev) => ({
                                                                            ...prev,
                                                                            [p.userId]: e.target.value,
                                                                        }))}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="btn-verify-code"
                                                                        disabled={verifyLoading[p.userId]}
                                                                        onClick={() => handleVerifyCode(p.userId)}
                                                                    >
                                                                        Verify
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="events-members-note">Awaiting invitation acceptance</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'builder' && (
                        <div className="events-builder-card">
                            <h2>
                                {builderMode === 'edit' ? 'Edit Event & Match Group' : 'Create New Event & Match Group'}
                            </h2>
                            <p className="events-builder-subtitle">
                                Fill event metadata, set venue requirements, and select curated members.
                            </p>

                            <div className="events-form-group">
                                <label className="events-form-label">Event Title / Code</label>
                                <input
                                    type="text"
                                    className="events-form-input"
                                    placeholder="e.g. Bay Area Connections - Event SP-2048"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="events-form-row">
                                <div className="events-form-group">
                                    <label className="events-form-label">Location / Area</label>
                                    <input
                                        type="text"
                                        className="events-form-input"
                                        placeholder="e.g. Bay Area, CA"
                                        value={form.location}
                                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    />
                                </div>
                                <div className="events-form-group">
                                    <label className="events-form-label">Venue Name</label>
                                    <input
                                        type="text"
                                        className="events-form-input"
                                        placeholder="e.g. Santa Clara, CA Venue Lounge"
                                        value={form.venueName}
                                        onChange={(e) => setForm({ ...form, venueName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="events-form-row">
                                <div className="events-form-group">
                                    <label className="events-form-label">Event Date</label>
                                    <input
                                        type="date"
                                        className="events-form-input"
                                        value={form.eventDate}
                                        onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                                    />
                                </div>
                                <div className="events-form-group">
                                    <label className="events-form-label">Event Time</label>
                                    <input
                                        type="time"
                                        className="events-form-input"
                                        value={form.eventTime}
                                        onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="events-form-row">
                                <div className="events-form-group">
                                    <label className="events-form-label">State Code (2 letters)</label>
                                    <input
                                        type="text"
                                        className="events-form-input"
                                        placeholder="e.g. CA"
                                        maxLength={2}
                                        value={form.stateCode}
                                        onChange={(e) => setForm({ ...form, stateCode: e.target.value.toUpperCase() })}
                                        disabled={builderMode === 'edit'}
                                    />
                                </div>
                                <div className="events-form-group">
                                    <label className="events-form-label">FIPS Code (5 digits)</label>
                                    <input
                                        type="text"
                                        className="events-form-input"
                                        placeholder="e.g. 06037"
                                        maxLength={5}
                                        value={form.fipsCode}
                                        onChange={(e) => setForm({ ...form, fipsCode: e.target.value.replace(/\D/g, '') })}
                                        disabled={builderMode === 'edit'}
                                    />
                                </div>
                            </div>

                            <div className="events-form-group">
                                <label className="events-form-label">Venue &amp; Event Requirements</label>
                                <div className="events-perks-dropdown-wrap">
                                    <button
                                        type="button"
                                        className="events-perks-dropdown-trigger"
                                        onClick={() => setPerksDropdownOpen((o) => !o)}
                                    >
                                        <span>
                                            {form.eventPerks.length} requirements selected
                                        </span>
                                        <ChevronDown size={16} className={perksDropdownOpen ? 'rotated' : ''} />
                                    </button>
                                    {perksDropdownOpen && (
                                        <div className="events-perks-dropdown-panel">
                                            {perksOptions.map((perk) => (
                                                <label key={perk} className="events-perk-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.eventPerks.includes(perk)}
                                                        onChange={() => togglePerk(perk)}
                                                    />
                                                    {perk}
                                                </label>
                                            ))}
                                            {customPerksInList.map((perk) => (
                                                <label key={perk} className="events-perk-checkbox events-perk-checkbox-custom">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.eventPerks.includes(perk)}
                                                        onChange={() => togglePerk(perk)}
                                                    />
                                                    {perk}
                                                </label>
                                            ))}
                                            <div className="events-perks-other">
                                                <label className="events-form-label">Other (comma-separated)</label>
                                                <textarea
                                                    className="events-form-input"
                                                    rows={2}
                                                    placeholder="e.g. Parking Included, Live Music"
                                                    value={form.customPerksText || ''}
                                                    onChange={(e) => setForm({ ...form, customPerksText: e.target.value })}
                                                />
                                                <div className="events-perks-other-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-events-cancel btn-perks-other"
                                                        onClick={cancelCustomPerks}
                                                        disabled={!form.customPerksText?.trim()}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-events-draft btn-perks-other"
                                                        onClick={addCustomPerks}
                                                        disabled={!form.customPerksText?.trim()}
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="events-members-picker">
                                <div className="events-members-picker-header">
                                    <h3>Select &amp; Assign Group Members</h3>
                                    <span className="events-selected-count">
                                        {selectedMembers.size} Members Selected
                                    </span>
                                </div>

                                <div className="events-search-row">
                                    <div className="events-search-bar">
                                        <Search size={16} className="events-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search candidates by name, location, profession..."
                                            value={candidateQuery}
                                            onChange={(e) => setCandidateQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && loadCandidates()}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-filter-toggle"
                                        onClick={() => {
                                            setFilterDraft({ ...candidateFilters })
                                            setFilterPopupOpen(true)
                                        }}
                                    >
                                        <SlidersHorizontal size={16} /> Filters
                                    </button>
                                </div>

                                {hasActiveFilters(candidateFilters) && (
                                    <button
                                        type="button"
                                        className="btn-remove-filters"
                                        onClick={() => {
                                            clearCandidateFilters()
                                            loadCandidates()
                                        }}
                                    >
                                        <X size={14} /> Remove filters
                                    </button>
                                )}

                                {filterPopupOpen && (
                                    <div className="events-filter-popup-overlay" onClick={() => setFilterPopupOpen(false)}>
                                        <div className="events-filter-popup" onClick={(e) => e.stopPropagation()}>
                                            <h4>Filter Candidates</h4>
                                            <div className="events-filter-panel">
                                                <input type="text" placeholder="Gender" value={filterDraft.gender} onChange={(e) => setFilterDraft({ ...filterDraft, gender: e.target.value })} />
                                                <input type="text" placeholder="Religion" value={filterDraft.religion} onChange={(e) => setFilterDraft({ ...filterDraft, religion: e.target.value })} />
                                                <input type="number" placeholder="Min age" value={filterDraft.minAge} onChange={(e) => setFilterDraft({ ...filterDraft, minAge: e.target.value })} />
                                                <input type="number" placeholder="Max age" value={filterDraft.maxAge} onChange={(e) => setFilterDraft({ ...filterDraft, maxAge: e.target.value })} />
                                                <input type="text" placeholder="Location" value={filterDraft.location} onChange={(e) => setFilterDraft({ ...filterDraft, location: e.target.value })} />
                                                <input type="text" placeholder="Profession" value={filterDraft.profession} onChange={(e) => setFilterDraft({ ...filterDraft, profession: e.target.value })} />
                                                <input type="text" placeholder="Education" value={filterDraft.educationLevel} onChange={(e) => setFilterDraft({ ...filterDraft, educationLevel: e.target.value })} />
                                                <input type="text" placeholder="Marital status" value={filterDraft.maritalStatus} onChange={(e) => setFilterDraft({ ...filterDraft, maritalStatus: e.target.value })} />
                                                <label className="events-verified-toggle">
                                                    <input type="checkbox" checked={filterDraft.verifiedOnly} onChange={(e) => setFilterDraft({ ...filterDraft, verifiedOnly: e.target.checked })} />
                                                    Verified users only
                                                </label>
                                            </div>
                                            <div className="events-filter-popup-actions">
                                                <button type="button" className="btn-events-cancel" onClick={() => setFilterPopupOpen(false)}>
                                                    Close
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-events-draft"
                                                    onClick={() => {
                                                        applyFilterDraft()
                                                        loadCandidates()
                                                    }}
                                                >
                                                    Apply Filters
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="events-candidates-grid">
                                    {candidatesLoading && (
                                        <div className="events-empty-state">Loading candidates...</div>
                                    )}
                                    {!candidatesLoading && candidates.length === 0 && (
                                        <div className="events-empty-state">No users match your search</div>
                                    )}
                                    {!candidatesLoading && candidates.map((c) => (
                                        <div
                                            key={c.userId}
                                            className={`events-candidate-card ${selectedMembers.has(c.userId) ? 'selected' : ''}`}
                                            onClick={() => toggleMember(c.userId)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedMembers.has(c.userId)}
                                                onChange={() => toggleMember(c.userId)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="events-member-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                                                {c.profilePhotoUrl ? (
                                                    <img src={getMediaUrl(c.profilePhotoUrl)} alt="" />
                                                ) : (
                                                    c.displayName?.[0]?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div>
                                                <div className="events-candidate-name">
                                                    {c.displayName}
                                                    {c.verified && ' ✓'}
                                                </div>
                                                <div className="events-candidate-sub">
                                                    {[c.gender, c.occupation].filter(Boolean).join(' • ') || 'Profile incomplete'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {editingEventStatus === 'published' && (
                                <div className="events-live-notify-banner">
                                    <button
                                        type="button"
                                        className={`btn-event-notify ${liveNotificationActive ? 'active' : ''}`}
                                        onClick={() => setLiveNotificationActive((v) => !v)}
                                    >
                                        <Megaphone size={14} />
                                        {liveNotificationActive
                                            ? 'Live Notification Active — participants will be emailed on save'
                                            : 'Enable Live Notification before saving to email participants'}
                                    </button>
                                </div>
                            )}

                            <div className="events-builder-footer">
                                <button
                                    type="button"
                                    className="btn-events-cancel"
                                    disabled={saving}
                                    onClick={() => setActiveTab('manage')}
                                >
                                    <X size={14} /> Cancel
                                </button>

                                {editingEventStatus === 'published' ? (
                                    <button
                                        type="button"
                                        className="btn-events-publish"
                                        disabled={saving}
                                        onClick={handleSaveChanges}
                                    >
                                        <Send size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                ) : (
                                    <>
                                        {builderMode === 'edit' && editingEventStatus === 'draft' && (
                                            <button
                                                type="button"
                                                className="btn-events-delete"
                                                disabled={saving}
                                                onClick={() => handleDeleteDraft(editingEventId)}
                                            >
                                                <Trash2 size={14} /> Delete Draft
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn-events-draft"
                                            disabled={saving}
                                            onClick={handleSaveDraft}
                                        >
                                            <Bookmark size={14} /> Save Draft
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-events-publish"
                                            disabled={saving}
                                            onClick={handlePublish}
                                        >
                                            <Send size={14} /> {saving ? 'Publishing...' : 'Publish Event'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
