import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const emptyEducation = { institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }

export default function Profile() {
    const { user, loading: authLoading, refreshUser } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [photoUrl, setPhotoUrl] = useState('')

    const [form, setForm] = useState({
        aboutMe: '',
        occupation: '',
        lifestyle: '',
        locationCity: '',
        locationCountry: '',
        dateOfBirth: '',
        gender: '',
        interests: '',
    })
    const [isEditing, setIsEditing] = useState(false)

    const [educations, setEducations] = useState([emptyEducation])
    const [questions, setQuestions] = useState([])
    const [answers, setAnswers] = useState({}) // questionId -> value

    const loadProfile = async () => {
        try {
            const [profileRes, questionsRes] = await Promise.all([
                api.get('/api/profile'),
                api.get('/api/questions'),
            ])

            const p = profileRes.data.profile
            if (p) {
                setForm({
                    aboutMe: p.aboutMe || '',
                    occupation: p.occupation || '',
                    lifestyle: p.lifestyle || '',
                    locationCity: p.locationCity || '',
                    locationCountry: p.locationCountry || '',
                    dateOfBirth: p.dateOfBirth || '',
                    gender: p.gender || '',
                    interests: (p.interests || []).join(', '),
                })
                setPhotoUrl(p.profilePhotoUrl || '')
                if (p.educations && p.educations.length > 0) {
                    setEducations(p.educations.map((e) => ({
                        institution: e.institution || '',
                        degree: e.degree || '',
                        fieldOfStudy: e.fieldOfStudy || '',
                        startYear: e.startYear || '',
                        endYear: e.endYear || '',
                    })))
                } else {
                    setEducations([emptyEducation])
                }
            } else {
                setEducations([emptyEducation])
            }

            setQuestions(questionsRes.data)
            const initialAnswers = {}
            questionsRes.data.forEach((q) => {
                initialAnswers[q.id] = q.answerValue || ''
            })
            setAnswers(initialAnswers)
        } catch (e) {
            setError('Failed to load profile data')
        } finally {
            setLoading(false)
        }
    }

    const location = useLocation()

    const handleEditToggle = () => {
        setMessage('')
        setError('')
        setIsEditing(true)
    }

    const handleCancel = () => {
        setIsEditing(false)
        setMessage('')
        setError('')
        loadProfile()
    }

    useEffect(() => {
        if (!authLoading) {
            loadProfile()
        }
    }, [authLoading, location.key])

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleEducationChange = (index, field, value) => {
        const next = [...educations]
        next[index][field] = value
        setEducations(next)
    }

    const addEducation = () => setEducations([...educations, { ...emptyEducation }])
    const removeEducation = (index) => setEducations(educations.filter((_, i) => i !== index))

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        const data = new FormData()
        data.append('file', file)
        try {
            const res = await api.post('/api/profile/photo', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            setPhotoUrl(res.data.url)
            setMessage('Photo uploaded')
        } catch (err) {
            setError(err.response?.data?.message || 'Photo upload failed')
        }
    }

    const handleAnswerChange = (questionId, value) => {
        setAnswers({ ...answers, [questionId]: value })
    }

    const toggleMultiChoice = (questionId, option) => {
        const current = (answers[questionId] || '').split(',').map((s) => s.trim()).filter(Boolean)
        const exists = current.includes(option)
        const next = exists ? current.filter((o) => o !== option) : [...current, option]
        setAnswers({ ...answers, [questionId]: next.join(', ') })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        setError('')
        try {
            const payload = {
                aboutMe: form.aboutMe,
                occupation: form.occupation,
                lifestyle: form.lifestyle,
                locationCity: form.locationCity,
                locationCountry: form.locationCountry,
                dateOfBirth: form.dateOfBirth || null,
                gender: form.gender || null,
                interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
                educations: educations
                    .filter((ed) => ed.institution.trim())
                    .map((ed) => ({
                        institution: ed.institution,
                        degree: ed.degree,
                        fieldOfStudy: ed.fieldOfStudy,
                        startYear: ed.startYear ? parseInt(ed.startYear, 10) : null,
                        endYear: ed.endYear ? parseInt(ed.endYear, 10) : null,
                    })),
            }

            await api.put('/api/profile', payload)

            const answerPayload = Object.entries(answers)
                .filter(([_, value]) => value !== '' && value !== null)
                .map(([questionId, value]) => ({ questionId: Number(questionId), answerValue: value }))
            
            if (answerPayload.length > 0) {
                await api.post('/api/questions/answers', answerPayload)
            }

            await refreshUser()
            await loadProfile()
            setIsEditing(false)
            setMessage('Profile saved successfully!')
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save profile')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="center">Loading...</div>
            </>
        )
    }

    const renderField = (label, value) => (
        <div className="profile-display-row">
            <span className="profile-display-label">{label}</span>
            <span className="profile-display-value">{value || <span className="muted">Not added yet</span>}</span>
        </div>
    )

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="flex-between" style={{ marginBottom: 20 }}>
                    <div>
                        <h1>My Profile</h1>
                        {user?.profileCompleted && <span className="badge badge-yes">Completed</span>}
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={isEditing ? handleCancel : handleEditToggle}>
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>

                {message && <div className="success">{message}</div>}
                {error && <div className="error">{error}</div>}

                {isEditing ? (
                    <form onSubmit={handleSubmit}>
                        <div className="card">
                            <h2>Profile Photo</h2>
                            <div className="flex">
                                {photoUrl ? (
                                    <img className="avatar" src={`${API_URL}${photoUrl}`} alt="Profile" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {user?.firstName?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                            </div>
                        </div>

                        <div className="card">
                            <h2>Personal Information</h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date of Birth</label>
                                    <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select name="gender" value={form.gender} onChange={handleChange}>
                                        <option value="">-- Select --</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h2>About Me</h2>
                            <div className="form-group">
                                <label>About me</label>
                                <textarea name="aboutMe" value={form.aboutMe} onChange={handleChange} placeholder="Tell us about yourself..." />
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input type="text" name="occupation" value={form.occupation} onChange={handleChange} placeholder="e.g. Software Engineer" />
                            </div>
                            <div className="form-group">
                                <label>Lifestyle</label>
                                <textarea name="lifestyle" value={form.lifestyle} onChange={handleChange} placeholder="Your lifestyle, hobbies, daily routine..." />
                            </div>
                        </div>

                        <div className="card">
                            <h2>Interests</h2>
                            <div className="form-group">
                                <label>Interests (comma separated)</label>
                                <input type="text" name="interests" value={form.interests} onChange={handleChange} placeholder="Travel, Music, Sports" />
                            </div>
                            <div>
                                {form.interests.split(',').map((i) => i.trim()).filter(Boolean).map((i, idx) => (
                                    <span className="chip" key={idx}>{i}</span>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <h2>Location</h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>City</label>
                                    <input type="text" name="locationCity" value={form.locationCity} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Country</label>
                                    <input type="text" name="locationCountry" value={form.locationCountry} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex-between">
                                <h2>Education</h2>
                                <button type="button" className="btn btn-sm btn-secondary" onClick={addEducation}>
                                    + Add
                                </button>
                            </div>
                            {educations.map((ed, index) => (
                                <div key={index} style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none', paddingTop: index > 0 ? 16 : 0, marginTop: index > 0 ? 16 : 0 }}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Institution</label>
                                            <input type="text" value={ed.institution} onChange={(e) => handleEducationChange(index, 'institution', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Degree</label>
                                            <input type="text" value={ed.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Field of study</label>
                                            <input type="text" value={ed.fieldOfStudy} onChange={(e) => handleEducationChange(index, 'fieldOfStudy', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Start year</label>
                                            <input type="number" value={ed.startYear} onChange={(e) => handleEducationChange(index, 'startYear', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>End year</label>
                                            <input type="number" value={ed.endYear} onChange={(e) => handleEducationChange(index, 'endYear', e.target.value)} />
                                        </div>
                                    </div>
                                    {educations.length > 1 && (
                                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removeEducation(index)}>
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {questions.length > 0 && (
                            <div className="card">
                                <h2>Additional Questions</h2>
                                <p style={{ color: '#6b7280', marginBottom: 16 }}>
                                    Questions set by the administrator.
                                </p>
                                {questions.map((q) => (
                                    <div className="form-group" key={q.id}>
                                        <label>
                                            {q.questionText}
                                            {q.required && <span style={{ color: '#dc2626' }}> *</span>}
                                            <span className="chip" style={{ marginLeft: 8 }}>{q.category}</span>
                                        </label>
                                        {renderQuestionInput(q, answers[q.id], handleAnswerChange, toggleMultiChoice)}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button type="submit" className="btn" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                ) : (
                    <>
                        <div className="profile-view-grid">
                            <div className="card profile-summary-card">
                                <div className="profile-summary-header">
                                    <div>
                                        <h2>{user?.firstName} {user?.lastName}</h2>
                                        <p className="muted">{user?.email}</p>
                                    </div>
                                    {photoUrl ? (
                                        <img className="avatar" src={`${API_URL}${photoUrl}`} alt="Profile" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {user?.firstName?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="profile-display-row">
                                    <span className="profile-display-label">About</span>
                                    <span className="profile-display-value">{form.aboutMe || <span className="muted">Not added yet</span>}</span>
                                </div>
                                <div className="profile-display-row">
                                    <span className="profile-display-label">Occupation</span>
                                    <span className="profile-display-value">{form.occupation || <span className="muted">Not added yet</span>}</span>
                                </div>
                            </div>

                            <div className="card profile-info-card">
                                <h2>Personal Information</h2>
                                {renderField('Date of Birth', form.dateOfBirth)}
                                {renderField('Gender', form.gender)}
                                {renderField('City', form.locationCity)}
                                {renderField('Country', form.locationCountry)}
                            </div>

                            <div className="card profile-info-card">
                                <h2>Interests</h2>
                                <div className="profile-display-value">
                                    {form.interests.split(',').map((item) => item.trim()).filter(Boolean).map((item, idx) => (
                                        <span className="chip" key={idx}>{item}</span>
                                    ))}
                                    {!form.interests && <span className="muted">Not added yet</span>}
                                </div>
                            </div>

                            <div className="card profile-info-card">
                                <h2>Education</h2>
                                {educations.every((ed) => !ed.institution) ? (
                                    <p className="muted">No education details added yet.</p>
                                ) : (
                                    educations.map((ed, index) => (
                                        <div key={index} className="profile-info-section">
                                            <strong>{ed.institution || 'Unknown institution'}</strong>
                                            <span>{ed.degree || 'No degree provided'} • {ed.fieldOfStudy || 'No field'} • {ed.startYear || ''}{ed.endYear ? ` - ${ed.endYear}` : ''}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {questions.length > 0 && (
                                <div className="card profile-info-card">
                                    <h2>Additional Questions</h2>
                                    {questions.map((q) => (
                                        <div key={q.id} className="profile-display-row">
                                            <span className="profile-display-label">{q.questionText}</span>
                                            <span className="profile-display-value">{(answers[q.id] && answers[q.id].toString()) || <span className="muted">No answer provided</span>}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

function renderQuestionInput(q, value, onChange, toggleMulti) {
    switch (q.type) {
        case 'TEXT':
            return <textarea value={value || ''} onChange={(e) => onChange(q.id, e.target.value)} />
        case 'NUMBER':
            return <input type="number" value={value || ''} onChange={(e) => onChange(q.id, e.target.value)} />
        case 'DATE':
            return <input type="date" value={value || ''} onChange={(e) => onChange(q.id, e.target.value)} />
        case 'SINGLE_CHOICE':
            return (
                <select value={value || ''} onChange={(e) => onChange(q.id, e.target.value)}>
                    <option value="">-- Select --</option>
                    {q.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            )
        case 'MULTI_CHOICE': {
            const selected = (value || '').split(',').map((s) => s.trim()).filter(Boolean)
            return (
                <div>
                    {q.options.map((opt) => (
                        <label className="checkbox" key={opt}>
                            <input
                                type="checkbox"
                                checked={selected.includes(opt)}
                                onChange={() => toggleMulti(q.id, opt)}
                            />
                            {opt}
                        </label>
                    ))}
                </div>
            )
        }
        default:
            return <input type="text" value={value || ''} onChange={(e) => onChange(q.id, e.target.value)} />
    }
}