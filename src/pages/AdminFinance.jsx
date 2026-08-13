import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import SiteFooter from '../components/SiteFooter'
import AdminRefundInspectionModal from '../components/AdminRefundInspectionModal'
import api from '../api/axios'
import './AdminFinance.css'

const PAGE_SIZE = 10

const PAYMENT_STATUS_OPTIONS = ['All Statuses', 'Succeeded', 'Failed', 'Pending', 'Refunded']
const REFUND_STATUS_OPTIONS = ['All Statuses', 'Initiated', 'In-Progress', 'Completed', 'Rejected']

function getInitials(name) {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

function formatStatusLabel(status) {
    if (!status) return 'Pending'
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function formatAmount(amount, currency = 'usd') {
    if (amount == null) return '$0.00'
    const symbol = currency?.toLowerCase() === 'usd' ? '$' : ''
    return `${symbol}${parseFloat(amount).toFixed(2)}`
}

function formatDate(dateValue) {
    if (!dateValue) return '—'
    return new Date(dateValue).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

function getRefundStatusClass(status) {
    switch (status) {
        case 'Completed': return 'refund-row-status-complete'
        case 'Rejected': return 'refund-row-status-rejected'
        case 'In-Progress': return 'refund-row-status-progress'
        default: return 'refund-row-status-pending'
    }
}

export default function AdminFinance() {
    const [activeTab, setActiveTab] = useState('refunds')
    const [payments, setPayments] = useState([])
    const [refunds, setRefunds] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('All Statuses')
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedRefund, setSelectedRefund] = useState(null)
    const [refundDetail, setRefundDetail] = useState(null)
    const [inspectionOpen, setInspectionOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchPayments = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/payments')
            setPayments(data || [])
        } catch (err) {
            console.error('Fetch payments error:', err)
        }
    }, [])

    const fetchRefunds = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/refunds')
            setRefunds(data || [])
        } catch (err) {
            console.error('Fetch refunds error:', err)
        }
    }, [])

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            await Promise.all([fetchPayments(), fetchRefunds()])
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load financial data')
        } finally {
            setLoading(false)
        }
    }, [fetchPayments, fetchRefunds])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    useEffect(() => {
        const hasActiveRefunds = refunds.some(
            (r) => r.status !== 'Completed' && r.status !== 'Rejected'
        )
        if (!hasActiveRefunds) return undefined

        const interval = setInterval(() => {
            fetchRefunds()
            if (inspectionOpen && selectedRefund) {
                api.get(`/admin/refunds/${selectedRefund}`).then(({ data }) => setRefundDetail(data))
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [refunds, inspectionOpen, selectedRefund, fetchRefunds])

    const openRefundInspection = async (refundId) => {
        try {
            const { data } = await api.get(`/admin/refunds/${refundId}`)
            setSelectedRefund(refundId)
            setRefundDetail(data)
            setInspectionOpen(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load refund details')
        }
    }

    const closeInspection = () => {
        setInspectionOpen(false)
        setSelectedRefund(null)
        setRefundDetail(null)
    }

    const handleRefundAction = async (action) => {
        if (!selectedRefund) return
        setActionLoading(true)
        try {
            const { data } = await api.post(`/admin/refunds/${selectedRefund}/${action}`)
            setRefundDetail(data)
            await fetchRefunds()
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed')
        } finally {
            setActionLoading(false)
        }
    }

    const filteredPayments = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        return payments.filter((payment) => {
            const matchesStatus =
                filterStatus === 'All Statuses'
                || formatStatusLabel(payment.status) === filterStatus

            const matchesSearch =
                !query
                || (payment.userName && payment.userName.toLowerCase().includes(query))
                || (payment.userEmail && payment.userEmail.toLowerCase().includes(query))
                || (payment.stripeChargeId && payment.stripeChargeId.toLowerCase().includes(query))

            return matchesStatus && matchesSearch
        })
    }, [payments, searchQuery, filterStatus])

    const filteredRefunds = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        return refunds.filter((refund) => {
            const matchesStatus =
                filterStatus === 'All Statuses'
                || refund.status === filterStatus

            const matchesSearch =
                !query
                || (refund.formattedRefundId && refund.formattedRefundId.toLowerCase().includes(query))

            return matchesStatus && matchesSearch
        })
    }, [refunds, searchQuery, filterStatus])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, filterStatus, activeTab])

    const paymentStats = useMemo(() => {
        const succeeded = payments.filter((p) => p.status === 'succeeded')
        const totalVolume = succeeded.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        const avgValue = succeeded.length > 0 ? totalVolume / succeeded.length : 0
        const successRate = payments.length > 0
            ? ((succeeded.length / payments.length) * 100).toFixed(1)
            : '0.0'

        return {
            totalVolume: totalVolume.toFixed(2),
            successfulCharges: succeeded.length,
            avgValue: avgValue.toFixed(2),
            successRate,
        }
    }, [payments])

    const refundStats = useMemo(() => {
        const pending = refunds.filter((r) => r.status === 'Initiated' || r.status === 'In-Progress').length
        const completed = refunds.filter((r) => r.status === 'Completed').length
        const processedRefunds = refunds.filter((r) => r.status === 'Completed')
        const totalRefundVolume = processedRefunds.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
        const successRate = refunds.length > 0
            ? ((completed / refunds.length) * 100).toFixed(1)
            : '0.0'

        return { pending, totalRefundVolume: totalRefundVolume.toFixed(2), successRate }
    }, [refunds])

    const currentData = activeTab === 'payments' ? filteredPayments : filteredRefunds
    const totalPages = Math.max(1, Math.ceil(currentData.length / PAGE_SIZE))
    const paginatedData = currentData.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    )

    const statusOptions = activeTab === 'payments' ? PAYMENT_STATUS_OPTIONS : REFUND_STATUS_OPTIONS

    const copyChargeId = async (chargeId) => {
        if (!chargeId) return
        try {
            await navigator.clipboard.writeText(chargeId)
        } catch (err) {
            console.error('Failed to copy charge ID', err)
        }
    }

    return (
        <>
            <Navbar />
            <div className="admin-finance-page">
                <div className="admin-finance-container">
                    <div className="admin-finance-header">
                        <div className="header-content">
                            <div className="breadcrumb-tag">Financial Administration</div>
                            <h1>Payment & Refund Operations</h1>
                            <p>Monitor account billing histories, process refund requests, and approve settlement payouts.</p>
                        </div>
                        <button
                            type="button"
                            className="btn-refresh-payments"
                            onClick={fetchAll}
                            disabled={loading}
                            title="Refresh records"
                        >
                            <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>↻</span>
                            {loading ? 'Refreshing...' : 'Refresh Records'}
                        </button>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="finance-tabs">
                        <button
                            type="button"
                            className={`finance-tab ${activeTab === 'refunds' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('refunds'); setFilterStatus('All Statuses'); setSearchQuery('') }}
                        >
                            Refund Applications
                        </button>
                        <button
                            type="button"
                            className={`finance-tab ${activeTab === 'payments' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('payments'); setFilterStatus('All Statuses'); setSearchQuery('') }}
                        >
                            Payment Details
                        </button>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon icon-red">$</div>
                            <div className="stat-content">
                                <div className="stat-label">Total Processed Volume</div>
                                <div className="stat-value">
                                    ${activeTab === 'payments' ? paymentStats.totalVolume : refundStats.totalRefundVolume}
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon icon-yellow">✓</div>
                            <div className="stat-content">
                                <div className="stat-label">
                                    {activeTab === 'payments' ? 'Successful Charges' : 'Pending Requests'}
                                </div>
                                <div className="stat-value">
                                    {activeTab === 'payments' ? paymentStats.successfulCharges : refundStats.pending}
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon icon-purple">▤</div>
                            <div className="stat-content">
                                <div className="stat-label">
                                    {activeTab === 'payments' ? 'Avg. Charge Value' : 'Total Refunds'}
                                </div>
                                <div className="stat-value">
                                    {activeTab === 'payments' ? `$${paymentStats.avgValue}` : refunds.length}
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon icon-green">↗</div>
                            <div className="stat-content">
                                <div className="stat-label">Settlement Success Rate</div>
                                <div className="stat-value">
                                    {activeTab === 'payments' ? `${paymentStats.successRate}%` : `${refundStats.successRate}%`}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="finance-controls-bar">
                        <div className="search-box-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder={activeTab === 'payments'
                                    ? 'Search user, email, or Stripe ID (ch_...)'
                                    : 'Search by refund ID...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filters-right-group">
                            <div className="filter-item">
                                <span className="filter-label">Status Filter:</span>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="filter-select"
                                >
                                    {statusOptions.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="finance-table-wrapper">
                        {activeTab === 'refunds' && (
                            <div className="refund-table-header">
                                <h3><i className="fa-solid fa-list" /> Refund Applications Audit Log</h3>
                                <span>Select any record to review details and perform administrative actions.</span>
                            </div>
                        )}

                        {loading && currentData.length === 0 ? (
                            <div className="loading-state">Loading records...</div>
                        ) : currentData.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">{activeTab === 'payments' ? '💳' : '📋'}</div>
                                <h3>No Records Found</h3>
                                <p>No records match your search or filter criteria.</p>
                            </div>
                        ) : activeTab === 'payments' ? (
                            <>
                                <table className="finance-table">
                                    <thead>
                                        <tr>
                                            <th>User Name</th>
                                            <th>Stripe Charge ID</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((payment) => (
                                            <tr key={payment.id}>
                                                <td className="col-user">
                                                    <div className="user-cell-inner">
                                                        <div className="user-avatar">{getInitials(payment.userName)}</div>
                                                        <div className="user-info">
                                                            <strong>{payment.userName}</strong>
                                                            <span className="user-email">{payment.userEmail}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="col-charge-id">
                                                    <div className="charge-id-inner">
                                                        <code title={payment.stripeChargeId}>{payment.stripeChargeId || '—'}</code>
                                                        {payment.stripeChargeId && (
                                                            <button
                                                                type="button"
                                                                className="btn-copy-id"
                                                                onClick={() => copyChargeId(payment.stripeChargeId)}
                                                                title="Copy charge ID"
                                                            >
                                                                ⧉
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="col-amount amount-cell">
                                                    {formatAmount(payment.amount, payment.currency)}
                                                </td>
                                                <td>
                                                    <span className={`payment-status payment-status-${payment.status}`}>
                                                        <span className="status-dot">●</span>
                                                        {formatStatusLabel(payment.status)}
                                                    </span>
                                                </td>
                                                <td className="col-date">{formatDate(payment.paymentDate)}</td>
                                                <td className="col-receipt">
                                                    {payment.receiptUrl ? (
                                                        <a
                                                            href={payment.receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-receipt-link"
                                                        >
                                                            📄 Receipt
                                                        </a>
                                                    ) : (
                                                        <span className="receipt-unavailable">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        ) : (
                            <table className="finance-table refund-table">
                                <thead>
                                    <tr>
                                        <th>Refund ID</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action State</th>
                                        <th>Submission Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((refund) => (
                                        <tr
                                            key={refund.refundId}
                                            className="refund-row-clickable"
                                            onClick={() => openRefundInspection(refund.refundId)}
                                        >
                                            <td className="col-refund-id">{refund.formattedRefundId}</td>
                                            <td className="col-amount amount-cell">{formatAmount(refund.amount)}</td>
                                            <td>
                                                <span className={`refund-row-status ${getRefundStatusClass(refund.status)}`}>
                                                    {refund.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="refund-action-badge">{refund.action}</span>
                                            </td>
                                            <td className="col-date">{formatDate(refund.submissionDate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {currentData.length > 0 && (
                            <div className="finance-pagination">
                                <span>
                                    Showing {paginatedData.length} of {currentData.length}{' '}
                                    {activeTab === 'payments' ? 'transactions' : 'refund records'}
                                </span>
                                <div className="pagination-controls">
                                    <button
                                        type="button"
                                        className="btn-page"
                                        disabled={currentPage <= 1}
                                        onClick={() => setCurrentPage((p) => p - 1)}
                                    >
                                        Previous
                                    </button>
                                    <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                                    <button
                                        type="button"
                                        className="btn-page"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage((p) => p + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AdminRefundInspectionModal
                open={inspectionOpen}
                refund={refundDetail}
                onClose={closeInspection}
                onRequestCall={() => handleRefundAction('request-call')}
                onApprove={() => handleRefundAction('approve')}
                onCloseRefund={() => handleRefundAction('close')}
                onCompletePayout={() => handleRefundAction('complete')}
                actionLoading={actionLoading}
            />
        <SiteFooter />
        </>
    )
}
