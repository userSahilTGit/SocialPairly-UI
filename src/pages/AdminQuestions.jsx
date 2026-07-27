import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'

const QUESTION_TYPES = ['TEXT', 'NUMBER', 'DATE', 'SINGLE_CHOICE', 'MULTI_CHOICE']
const emptyForm = {
    questionText: '',
    type: 'TEXT',
    category: '',
    required: false,
    active: true,
    options: [''],
}

export default function AdminQuestions() {
    const [questions, setQuestions] = useState([])
    const [form, setForm] = useState({ ...emptyForm })
    const [editingId, setEditingId] = useState(null)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const load = async () => {
        try {
            const { data } = await api.get('/admin/questions')
            setQuestions(data)
        } catch (e) {
            setError('Failed to load questions')
        }
    }

    useEffect(() => { load() }, [])

    const isChoice = form.type === 'SINGLE_CHOICE' || form.type === 'MULTI_CHOICE'

    const resetForm = () => {
        setForm({ ...emptyForm })
        setEditingId(null)
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    }

    const handleOptionChange = (index, value) => {
        const next = [...form.options]
        next[index] = value
        setForm({ ...form, options: next })
    }

    const addOption = () => setForm({ ...form, options: [...form.options, ''] })
    const removeOption = (index) =>
        setForm({ ...form, options: form.options.filter((_, i) => i !== index) })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setMessage('')
        setError('')
        try {
            const payload = {
                ...form,
                options: isChoice ? form.options.filter((o) => o.trim()) : [],
            }
            if (editingId) {
                await api.put(`/admin/questions/${editingId}`, payload)
                setMessage('Question updated')
            } else {
                await api.post('/admin/questions', payload)
                setMessage('Question created')
            }
            resetForm()
            load()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save question')
        }
    }

    const handleEdit = (q) => {
        setEditingId(q.id)
        setForm({
            questionText: q.questionText,
            type: q.type,
            category: q.category || '',
            required: q.required,
            active: q.active,
            options: q.options && q.options.length > 0 ? q.options.map((o) => o.optionText) : [''],
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this question? User answers for it will also be removed.')) return
        try {
            await api.delete(`/admin/questions/${id}`)
            setMessage('Question deleted')
            load()
        } catch (err) {
            setError('Failed to delete question')
        }
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <h1 style={{ marginBottom: 20 }}>Manage Questions</h1>

                {message && <div className="className=success">{message}</div>}
                {error && <div className="className=error">{error}</div>}

                <div className="card">
                    <h2>{editingId ? 'Edit Question' : 'Add New Question'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Question Text</label>
                            <input name="questionText" value={form.questionText} onChange={handleChange} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Type</label>
                                <select name="type" value={form.type} onChange={handleChange}>
                                    {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Lifestyle" />
                            </div>
                        </div>

                        {isChoice && (
                            <div className="form-group">
                                <label>Options</label>
                                {form.options.map((opt, index) => (
                                    <div className="option-row" key={index}>
                                        <input value={opt} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                                        {form.options.length > 1 && (
                                            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeOption(index)}>Delete</button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-secondary" onClick={addOption}>+ Add option</button>
                            </div>
                        )}

                        <div className="flex" style={{ marginBottom: 16 }}>
                            <label className="checkbox">
                                <input type="checkbox" name="required" checked={form.required} onChange={handleChange} />
                                Required
                            </label>
                            <label className="checkbox">
                                <input type="checkbox" name="active" checked={form.active} onChange={handleChange} />
                                Active
                            </label>
                        </div>

                        <div className="flex">
                            <button className="btn" type="submit">
                                {editingId ? 'Update' : 'Create'}
                            </button>
                            {editingId && (
                                <button className="btn btn-secondary" type="button" onClick={resetForm}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="card">
                    <h2>Existing Questions ({questions.length})</h2>
                    {questions.length === 0 ? (
                        <p style={{ color: '#6b7280' }}>No questions yet.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Type</th>
                                    <th>Category</th>
                                    <th>Required</th>
                                    <th>Active</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questions.map((q) => (
                                    <tr key={q.id}>
                                        <td>{q.questionText}</td>
                                        <td>{q.type}</td>
                                        <td>{q.category || '-'}</td>
                                        <td>{q.required ? 'Yes' : 'No'}</td>
                                        <td>
                                            <span className={`badge ${q.active ? 'badge-yes' : 'badge-no'}`}>
                                                {q.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex" style={{ gap: 8 }}>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(q)}>Edit</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q.id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    )
}