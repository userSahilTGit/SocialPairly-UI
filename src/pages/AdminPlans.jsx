import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './AdminPlans.css'

export default function AdminPlans() {
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingPlan, setEditingPlan] = useState(null)
    const [deletingPlan, setDeletingPlan] = useState(null)
    const [filterStatus, setFilterStatus] = useState('All Status')
    const [filterType, setFilterType] = useState('All Types')
    const [formData, setFormData] = useState({
        planName: '',
        planType: 'MONTHLY',
        durationDays: '',
        amount: '',
        description: '',
        isActive: true,
    })

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/api/plans/admin/all')
            setPlans(data)
            setError('')
        } catch (err) {
            setError('Failed to load plans')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddNewClick = () => {
        setEditingPlan(null)
        setFormData({
            planName: '',
            planType: 'MONTHLY',
            durationDays: '',
            amount: '',
            description: '',
            isActive: true,
        })
        setIsModalOpen(true)
    }

    const handleEditClick = (plan) => {
        setEditingPlan(plan)
        setFormData({
            planName: plan.planName,
            planType: plan.planType,
            durationDays: plan.durationDays.toString(),
            amount: plan.amount.toString(),
            description: plan.description,
            isActive: plan.isActive,
        })
        setIsModalOpen(true)
    }

    const handleDeleteClick = (plan) => {
        setDeletingPlan(plan)
        setIsDeleteModalOpen(true)
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        })
    }

    const handleSavePlan = async () => {
        try {
            setError('')
            setSuccess('')

            // Validate form
            if (!formData.planName || !formData.durationDays || !formData.amount || !formData.description) {
                setError('All fields are required')
                return
            }

            const payload = {
                planName: formData.planName,
                planType: formData.planType,
                durationDays: parseInt(formData.durationDays),
                amount: parseFloat(formData.amount),
                description: formData.description,
                isActive: formData.isActive,
            }

            if (editingPlan) {
                // Update existing plan
                await api.put(`/api/plans/admin/${editingPlan.id}`, payload)
                setSuccess('Plan updated successfully!')
            } else {
                // Create new plan
                await api.post('/api/plans/admin', payload)
                setSuccess('Plan created successfully!')
            }

            setIsModalOpen(false)
            fetchPlans()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save plan')
        }
    }

    const handleConfirmDelete = async () => {
        try {
            setError('')
            setSuccess('')
            await api.delete(`/api/plans/admin/${deletingPlan.id}`)
            setSuccess('Plan deleted successfully!')
            setIsDeleteModalOpen(false)
            setDeletingPlan(null)
            fetchPlans()
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete plan')
        }
    }

    const filteredPlans = plans.filter((plan) => {
        const statusMatch =
            filterStatus === 'All Status' || (filterStatus === 'Active' ? plan.isActive : !plan.isActive)
        const typeMatch = filterType === 'All Types' || plan.planType === filterType

        return statusMatch && typeMatch
    })

    const stats = {
        totalPlans: plans.length,
        activeStatus: plans.filter((p) => p.isActive).length,
        avgPrice: plans.length > 0 ? (plans.reduce((sum, p) => sum + parseFloat(p.amount), 0) / plans.length).toFixed(2) : '0.00',
        vipPlans: plans.filter((p) => p.planName.toLowerCase().includes('unlimited')).length,
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="center">Loading plans...</div>
            </>
        )
    }

    return (
        <>
            <Navbar />
            <div className="container">
                {/* Header Section */}
                <div className="admin-plans-header">
                    <div className="header-content">
                        <h1>Subscription Plans Control</h1>
                        <p>Add new plans, modify existing features, pricing, or activate/deactivate tiers in real-time.</p>
                    </div>
                    <button className="btn-add-plan" onClick={handleAddNewClick}>
                        + ADD NEW PLAN
                    </button>
                </div>

                {/* Alerts */}
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📋</div>
                        <div className="stat-content">
                            <div className="stat-label">Total Plans</div>
                            <div className="stat-value">{stats.totalPlans}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✓</div>
                        <div className="stat-content">
                            <div className="stat-label">Active Status</div>
                            <div className="stat-value">{stats.activeStatus} / {stats.totalPlans}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">$</div>
                        <div className="stat-content">
                            <div className="stat-label">Avg. Plan Price</div>
                            <div className="stat-value">${stats.avgPrice}</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">👑</div>
                        <div className="stat-content">
                            <div className="stat-label">VIP / Unlimited Tier</div>
                            <div className="stat-value">{stats.vipPlans}</div>
                        </div>
                    </div>
                </div>

                {/* Filters and Controls */}
                <div className="plans-controls">
                    <input type="text" placeholder="Search plans by name or description..." className="search-box" />
                    <div className="filter-group">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
                            <option>All Types</option>
                            <option>MONTHLY</option>
                            <option>WEEKLY</option>
                            <option>QUARTERLY</option>
                            <option>YEARLY</option>
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Plans Table */}
                <div className="plans-table-wrapper">
                    <table className="plans-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>PLAN NAME & DETAILS</th>
                                <th>TYPE</th>
                                <th>DURATION</th>
                                <th>PRICE</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlans.length > 0 ? (
                                filteredPlans.map((plan) => (
                                    <tr key={plan.id}>
                                        <td className="id-cell">#{plan.id}</td>
                                        <td className="name-cell">
                                            <strong>{plan.planName}</strong>
                                            <div className="description">{plan.description?.substring(0, 50)}...</div>
                                        </td>
                                        <td>
                                            <span className="badge badge-type">{plan.planType}</span>
                                        </td>
                                        <td>{plan.durationDays} Days</td>
                                        <td className="price-cell">${parseFloat(plan.amount).toFixed(2)}</td>
                                        <td>
                                            <span className={`badge ${plan.isActive ? 'badge-active' : 'badge-inactive'}`}>
                                                {plan.isActive ? '● Active' : '● Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="btn-action btn-edit" onClick={() => handleEditClick(plan)} title="Edit">
                                                ✎
                                            </button>
                                            <button className="btn-action btn-delete" onClick={() => handleDeleteClick(plan)} title="Delete">
                                                🗑
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">No plans found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingPlan ? `Edit Subscription Plan` : 'Add New Subscription Plan'}</h2>
                            {editingPlan && <p>Modifying plan #{editingPlan.id} ({editingPlan.planName})</p>}
                            {!editingPlan && <p>Create a new pricing tier for HeartSync daters.</p>}
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Plan Name *</label>
                                    <input
                                        type="text"
                                        name="planName"
                                        placeholder="e.g. Basic Monthly"
                                        value={formData.planName}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Plan Type *</label>
                                    <select name="planType" value={formData.planType} onChange={handleInputChange}>
                                        <option value="MONTHLY">MONTHLY</option>
                                        <option value="WEEKLY">WEEKLY</option>
                                        <option value="QUARTERLY">QUARTERLY</option>
                                        <option value="YEARLY">YEARLY</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Duration (Days) *</label>
                                    <input
                                        type="number"
                                        name="durationDays"
                                        placeholder="30"
                                        value={formData.durationDays}
                                        onChange={handleInputChange}
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Amount ($) *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        placeholder="50"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        min="0.01"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    placeholder="Describe core features and messaging perks..."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="4"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                    />
                                    <span>Set Plan as Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSavePlan}>
                                {editingPlan ? 'Update Plan' : 'Create Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
                    <div className="modal-confirm" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-icon">⚠️</div>
                        <h2>Delete Subscription Plan?</h2>
                        <p>
                            Are you sure you want to delete "<strong>{deletingPlan?.planName}</strong>" (#{deletingPlan?.id})? This action
                            cannot be undone.
                        </p>
                        <div className="confirm-buttons">
                            <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleConfirmDelete}>
                                YES, DELETE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
