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
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState('grid') // 'grid' or 'table'

    const initialFormState = {
        planName: '',
        planType: 'WEEKLY',
        durationDays: '',
        amount: '',
        tokensIncluded: '',
        communityPosts: '',
        subBadgeTag: '',
        description: '',
        isActive: true,
        isFeatured: false,
    }

    const [formData, setFormData] = useState(initialFormState)

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/api/plans/admin/all')
            setPlans(data || [])
            setError('')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load subscription plans')
            console.error('Fetch plans error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddNewClick = () => {
        setEditingPlan(null)
        setFormData(initialFormState)
        setError('')
        setSuccess('')
        setIsModalOpen(true)
    }

    const handleEditClick = (plan) => {
        setEditingPlan(plan)
        setFormData({
            planName: plan.planName || '',
            planType: plan.planType || 'MONTHLY',
            durationDays: plan.durationDays != null ? String(plan.durationDays) : '',
            amount: plan.amount != null ? String(plan.amount) : '',
            tokensIncluded: plan.tokensIncluded || '',
            communityPosts: plan.communityPosts || '',
            subBadgeTag: plan.subBadgeTag || '',
            description: plan.description || '',
            isActive: plan.isActive ?? true,
            isFeatured: plan.isFeatured ?? false,
        })
        setError('')
        setSuccess('')
        setIsModalOpen(true)
    }

    const handleDeleteClick = (plan) => {
        setDeletingPlan(plan)
        setError('')
        setSuccess('')
        setIsDeleteModalOpen(true)
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleSavePlan = async (e) => {
        if (e) e.preventDefault()
        try {
            setError('')
            setSuccess('')

            // Validate form
            if (!formData.planName.trim()) {
                setError('Plan Name is required')
                return
            }
            if (!formData.durationDays || isNaN(formData.durationDays) || Number(formData.durationDays) <= 0) {
                setError('Duration (Days) must be a valid positive number')
                return
            }
            if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
                setError('Amount ($) must be a valid positive number')
                return
            }
            if (!formData.description.trim()) {
                setError('Description is required')
                return
            }

            const payload = {
                planName: formData.planName.trim(),
                planType: formData.planType,
                durationDays: parseInt(formData.durationDays, 10),
                amount: parseFloat(formData.amount),
                tokensIncluded: formData.tokensIncluded.trim() || null,
                communityPosts: formData.communityPosts.trim() || null,
                subBadgeTag: formData.subBadgeTag.trim() || null,
                description: formData.description.trim(),
                isActive: Boolean(formData.isActive),
                isFeatured: Boolean(formData.isFeatured),
            }

            if (editingPlan) {
                // Update existing plan
                await api.put(`/api/plans/admin/${editingPlan.id}`, payload)
                setSuccess(`Plan "${payload.planName}" updated successfully!`)
            } else {
                // Create new plan
                await api.post('/api/plans/admin', payload)
                setSuccess(`Plan "${payload.planName}" created successfully!`)
            }

            setIsModalOpen(false)
            fetchPlans()
        } catch (err) {
            console.error('Save plan error:', err)
            setError(err.response?.data?.message || 'Failed to save plan')
        }
    }

    const handleConfirmDelete = async () => {
        if (!deletingPlan) return
        try {
            setError('')
            setSuccess('')
            await api.delete(`/api/plans/admin/${deletingPlan.id}`)
            setSuccess(`Plan "${deletingPlan.planName}" deleted successfully!`)
            setIsDeleteModalOpen(false)
            setDeletingPlan(null)
            fetchPlans()
        } catch (err) {
            console.error('Delete plan error:', err)
            setError(err.response?.data?.message || 'Failed to delete plan')
        }
    }

    const filteredPlans = plans.filter((plan) => {
        const matchesStatus =
            filterStatus === 'All Status' || (filterStatus === 'Active' ? plan.isActive : !plan.isActive)
        const matchesType = filterType === 'All Types' || plan.planType === filterType
        const query = searchQuery.toLowerCase().trim()
        const matchesSearch =
            !query ||
            (plan.planName && plan.planName.toLowerCase().includes(query)) ||
            (plan.description && plan.description.toLowerCase().includes(query)) ||
            (plan.subBadgeTag && plan.subBadgeTag.toLowerCase().includes(query))

        return matchesStatus && matchesType && matchesSearch
    })

    const stats = {
        totalPlans: plans.length,
        activeStatus: plans.filter((p) => p.isActive).length,
        avgPrice:
            plans.length > 0
                ? (plans.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) / plans.length).toFixed(2)
                : '0.00',
        vipPlans: plans.filter((p) => p.isFeatured || (p.planName || '').toLowerCase().includes('unlimited') || (p.tokensIncluded || '').toLowerCase().includes('unlimited')).length,
    }

    return (
        <>
            <Navbar />
            <div className="admin-plans-page">
                <div className="admin-plans-container">
                    {/* Header Section */}
                    <div className="admin-plans-header">
                        <div className="header-content">
                            <div className="breadcrumb-tag">Catalog Management</div>
                            <h1>Subscription Plans</h1>
                            <p>Add new plans, modify existing features, pricing, or activate/deactivate tiers in real-time.</p>
                        </div>
                        <button type="button" className="btn-add-plan" onClick={handleAddNewClick}>
                            + ADD NEW PLAN
                        </button>
                    </div>

                    {/* Alerts */}
                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* Stats Grid */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon icon-red">📋</div>
                            <div className="stat-content">
                                <div className="stat-label">Total Plans</div>
                                <div className="stat-value">{stats.totalPlans}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon icon-yellow">$</div>
                            <div className="stat-content">
                                <div className="stat-label">Avg. Plan Price</div>
                                <div className="stat-value">${stats.avgPrice}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon icon-purple">👑</div>
                            <div className="stat-content">
                                <div className="stat-label">VIP / Unlimited Tier</div>
                                <div className="stat-value">{stats.vipPlans}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon icon-green">✓</div>
                            <div className="stat-content">
                                <div className="stat-label">Active Status</div>
                                <div className="stat-value">{stats.activeStatus} / {stats.totalPlans}</div>
                            </div>
                        </div>
                    </div>

                    {/* Filters and View Controls Bar */}
                    <div className="plans-controls-bar">
                        <div className="search-box-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search plans by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="filters-right-group">
                            <div className="filter-item">
                                <span className="filter-label">Type:</span>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="All Types">All Types</option>
                                    <option value="WEEKLY">WEEKLY</option>
                                    <option value="MONTHLY">MONTHLY</option>
                                    <option value="QUARTERLY">QUARTERLY</option>
                                    <option value="YEARLY">YEARLY</option>
                                </select>
                            </div>

                            <div className="filter-item">
                                <span className="filter-label">Status:</span>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="All Status">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="view-toggle-group">
                                <button
                                    type="button"
                                    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                                    onClick={() => setViewMode('table')}
                                    title="Table View"
                                >
                                    ▤
                                </button>
                                <button
                                    type="button"
                                    className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Grid View"
                                >
                                    ▦
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Section: Grid View or Table View */}
                    {loading ? (
                        <div className="loading-state">Loading subscription plans...</div>
                    ) : filteredPlans.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📂</div>
                            <h3>No Plans Found</h3>
                            <p>No subscription plans match your search or filter criteria.</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* GRID VIEW CARDS (Matches Image 4) */
                        <div className="plans-cards-grid">
                            {filteredPlans.map((plan) => (
                                <div className="plan-admin-card" key={plan.id}>
                                    <div className="card-top-header">
                                        <span className="plan-type-pill">{plan.planType}</span>
                                        <div className="plan-price-tag">${parseFloat(plan.amount || 0).toFixed(2)}</div>
                                    </div>

                                    <h3 className="card-plan-title">{plan.planName}</h3>

                                    {plan.subBadgeTag && (
                                        <div className="card-sub-badge">{plan.subBadgeTag}</div>
                                    )}

                                    <p className="card-plan-description">{plan.description}</p>

                                    <div className="card-metrics-row">
                                        <div className="metric-badge">
                                            <span className="metric-icon">🪙</span>
                                            <span>{plan.tokensIncluded || 'Tokens N/A'}</span>
                                        </div>
                                        <div className="metric-badge">
                                            <span className="metric-icon">🕒</span>
                                            <span>{plan.durationDays} Days</span>
                                        </div>
                                        {plan.communityPosts && (
                                            <div className="metric-badge">
                                                <span className="metric-icon">📝</span>
                                                <span>{plan.communityPosts}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-footer-row">
                                        <div className={`status-indicator ${plan.isActive ? 'active' : 'inactive'}`}>
                                            <span className="dot">●</span> {plan.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                        <div className="card-actions">
                                            <button
                                                type="button"
                                                className="btn-card-edit"
                                                onClick={() => handleEditClick(plan)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-card-delete"
                                                onClick={() => handleDeleteClick(plan)}
                                                title="Delete Plan"
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* TABLE VIEW */
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
                                    {filteredPlans.map((plan) => (
                                        <tr key={plan.id}>
                                            <td className="id-cell">#{plan.id}</td>
                                            <td className="name-cell">
                                                <strong>{plan.planName}</strong>
                                                {plan.subBadgeTag && <span className="sub-tag-inline">{plan.subBadgeTag}</span>}
                                                <div className="description">{plan.description}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-type">{plan.planType}</span>
                                            </td>
                                            <td>{plan.durationDays} Days</td>
                                            <td className="price-cell">${parseFloat(plan.amount || 0).toFixed(2)}</td>
                                            <td>
                                                <span className={`badge ${plan.isActive ? 'badge-active' : 'badge-inactive'}`}>
                                                    {plan.isActive ? '● Active' : '● Inactive'}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <button
                                                    type="button"
                                                    className="btn-action btn-edit"
                                                    onClick={() => handleEditClick(plan)}
                                                    title="Edit"
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action btn-delete"
                                                    onClick={() => handleDeleteClick(plan)}
                                                    title="Delete"
                                                >
                                                    🗑
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD / EDIT SUBSCRIPTION PLAN MODAL (Matches Image 1 & Image 2) */}
            {isModalOpen && (
                <div className="plan-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="plan-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="plan-modal-header">
                            <div className="modal-header-titles">
                                <h2>{editingPlan ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}</h2>
                                <p>
                                    {editingPlan
                                        ? `Modifying plan #${editingPlan.id} (${editingPlan.planName})`
                                        : 'Create a new pricing tier for HeartSync daters.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="plan-modal-close-btn"
                                onClick={() => setIsModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="plan-modal-body">
                            <div className="form-grid-2">
                                <div className="form-field">
                                    <label>
                                        Plan Name <span className="req">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="planName"
                                        placeholder="e.g. Basic Monthly"
                                        value={formData.planName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Plan Type <span className="req">*</span>
                                    </label>
                                    <select
                                        name="planType"
                                        value={formData.planType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="WEEKLY">WEEKLY</option>
                                        <option value="MONTHLY">MONTHLY</option>
                                        <option value="QUARTERLY">QUARTERLY</option>
                                        <option value="YEARLY">YEARLY</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-field">
                                    <label>
                                        Duration (Days) <span className="req">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="durationDays"
                                        placeholder="7"
                                        value={formData.durationDays}
                                        onChange={handleInputChange}
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Amount ($) <span className="req">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="amount"
                                        placeholder="e.g. 49.99"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-field">
                                    <label>Tokens Included</label>
                                    <input
                                        type="text"
                                        name="tokensIncluded"
                                        placeholder="e.g. 5,000 or UNLIMITED"
                                        value={formData.tokensIncluded}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Community Posts</label>
                                    <input
                                        type="text"
                                        name="communityPosts"
                                        placeholder="e.g. 10 Posts or UNLIMITED"
                                        value={formData.communityPosts}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="form-field full-width">
                                <label>Sub-badge Tag (Optional)</label>
                                <input
                                    type="text"
                                    name="subBadgeTag"
                                    placeholder="e.g. Save 20%, Trial Pass, Best Value"
                                    value={formData.subBadgeTag}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-field full-width">
                                <label>
                                    Description <span className="req">*</span>
                                </label>
                                <textarea
                                    name="description"
                                    placeholder="Describe core features and messaging perks..."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows="3"
                                    required
                                />
                            </div>

                            <div className="toggles-flex-row">
                                <label className="toggle-label-item">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                        className="toggle-checkbox-hidden"
                                    />
                                    <span className={`custom-switch ${formData.isActive ? 'active' : ''}`}>
                                        <span className="switch-knob" />
                                    </span>
                                    <span className="toggle-text">Set Plan as Active</span>
                                </label>

                                <label className="toggle-label-item">
                                    <input
                                        type="checkbox"
                                        name="isFeatured"
                                        checked={formData.isFeatured}
                                        onChange={handleInputChange}
                                        className="toggle-checkbox-hidden"
                                    />
                                    <span className={`custom-switch ${formData.isFeatured ? 'active' : ''}`}>
                                        <span className="switch-knob" />
                                    </span>
                                    <span className="toggle-text">Highlight as Featured / Popular</span>
                                </label>
                            </div>

                            <div className="plan-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-modal-submit">
                                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL (Matches Image 3) */}
            {isDeleteModalOpen && (
                <div className="plan-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
                    <div className="delete-confirm-card" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-icon-circle">
                            <span className="warning-symbol">⚠️</span>
                        </div>
                        <h2 className="delete-title">Delete Subscription Plan?</h2>
                        <p className="delete-description">
                            Are you sure you want to delete "<strong>{deletingPlan?.planName}</strong>" (#{deletingPlan?.id})? This action cannot be undone.
                        </p>
                        <div className="delete-buttons-row">
                            <button
                                type="button"
                                className="btn-delete-cancel"
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-delete-confirm"
                                onClick={handleConfirmDelete}
                            >
                                YES, DELETE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
