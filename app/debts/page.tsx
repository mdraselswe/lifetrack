'use client'

import { useEffect, useState } from 'react'
import { getDebts, saveDebt, updateDebt, deleteDebt, addDebtPayment, deleteDebtPayment } from '@/lib/storage'
import { Debt, Payment } from '@/lib/types'
import { format } from 'date-fns'

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [showForm, setShowForm] = useState(false)
  const [personName, setPersonName] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mounted, setMounted] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNote, setPaymentNote] = useState('')
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [editPersonName, setEditPersonName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editingPayment, setEditingPayment] = useState<{debtId: string, payment: Payment} | null>(null)
  const [editPaymentAmount, setEditPaymentAmount] = useState('')
  const [editPaymentDate, setEditPaymentDate] = useState('')
  const [editPaymentNote, setEditPaymentNote] = useState('')

  useEffect(() => {
    setMounted(true)
    loadDebts()
  }, [])

  const loadDebts = () => {
    setDebts(getDebts())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!personName || !amount) {
      alert('নাম এবং পরিমাণ দিন')
      return
    }

    const debt: Debt = {
      id: Date.now().toString(),
      personName,
      amount: parseFloat(amount),
      reason,
      date,
      returned: false,
      createdAt: new Date().toISOString(),
      payments: [],
    }

    saveDebt(debt)
    setPersonName('')
    setAmount('')
    setReason('')
    setDate(new Date().toISOString().split('T')[0])
    setShowForm(false)
    loadDebts()
  }

  const handleToggleReturned = (debt: Debt) => {
    updateDebt(debt.id, { returned: !debt.returned })
    loadDebts()
  }

  const handleDelete = (id: string) => {
    if (confirm('এই রেকর্ডটি মুছে ফেলবেন?')) {
      deleteDebt(id)
      loadDebts()
    }
  }

  const handleAddPayment = (debtId: string) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('সঠিক পরিমাণ দিন')
      return
    }

    const payment: Payment = {
      id: Date.now().toString(),
      amount: parseFloat(paymentAmount),
      date: paymentDate,
      note: paymentNote,
      createdAt: new Date().toISOString(),
    }

    addDebtPayment(debtId, payment)
    setPaymentAmount('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentNote('')
    setShowPaymentForm(null)
    loadDebts()
  }

  const handleDeletePayment = (debtId: string, paymentId: string) => {
    if (confirm('এই পেমেন্ট মুছে ফেলবেন?')) {
      deleteDebtPayment(debtId, paymentId)
      loadDebts()
    }
  }

  const calculateRemaining = (debt: Debt): number => {
    if (!debt.payments || debt.payments.length === 0) {
      return debt.amount
    }
    const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0)
    return debt.amount - totalPaid
  }

  const getTotalPaid = (debt: Debt): number => {
    if (!debt.payments || debt.payments.length === 0) {
      return 0
    }
    return debt.payments.reduce((sum, p) => sum + p.amount, 0)
  }

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setEditPersonName(debt.personName)
    setEditAmount(debt.amount.toString())
    setEditReason(debt.reason || '')
    setEditDate(debt.date)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingDebt || !editPersonName || !editAmount) {
      alert('নাম এবং পরিমাণ দিন')
      return
    }

    updateDebt(editingDebt.id, {
      personName: editPersonName,
      amount: parseFloat(editAmount),
      reason: editReason,
      date: editDate,
    })

    setEditingDebt(null)
    setEditPersonName('')
    setEditAmount('')
    setEditReason('')
    setEditDate('')
    loadDebts()
  }

  const handleCancelEdit = () => {
    setEditingDebt(null)
    setEditPersonName('')
    setEditAmount('')
    setEditReason('')
    setEditDate('')
  }

  const handleEditPayment = (debtId: string, payment: Payment) => {
    setEditingPayment({ debtId, payment })
    setEditPaymentAmount(payment.amount.toString())
    setEditPaymentDate(payment.date)
    setEditPaymentNote(payment.note || '')
  }

  const handleEditPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingPayment || !editPaymentAmount || parseFloat(editPaymentAmount) <= 0) {
      alert('সঠিক পরিমাণ দিন')
      return
    }

    const updatedPayment: Payment = {
      ...editingPayment.payment,
      amount: parseFloat(editPaymentAmount),
      date: editPaymentDate,
      note: editPaymentNote,
    }

    // Delete old payment and add updated payment
    deleteDebtPayment(editingPayment.debtId, editingPayment.payment.id)
    addDebtPayment(editingPayment.debtId, updatedPayment)

    setEditingPayment(null)
    setEditPaymentAmount('')
    setEditPaymentDate('')
    setEditPaymentNote('')
    loadDebts()
  }

  const handleCancelPaymentEdit = () => {
    setEditingPayment(null)
    setEditPaymentAmount('')
    setEditPaymentDate('')
    setEditPaymentNote('')
  }

  if (!mounted) {
    return null
  }

  const activeDebts = debts.filter(d => !d.returned)
  const returnedDebts = debts.filter(d => d.returned)
  const totalActive = activeDebts.reduce((sum, d) => sum + d.amount, 0)
  const totalReturned = returnedDebts.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="min-h-full bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-green-900">💰 ধার দেওয়া</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'বাতিল' : '+ নতুন'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card bg-green-500 text-white">
            <div className="text-sm mb-1">বাকি আছে</div>
            <div className="text-3xl font-bold">৳{totalActive}</div>
          </div>
          <div className="card bg-green-700 text-white">
            <div className="text-sm mb-1">ফেরত পাওয়া</div>
            <div className="text-3xl font-bold">৳{totalReturned}</div>
          </div>
        </div>

        {showForm && (
          <div className="card mb-6 bg-white">
            <h2 className="text-xl font-semibold mb-4">নতুন ধার যোগ করুন</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">ব্যক্তির নাম *</label>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="input"
                  placeholder="যেমন: আলী"
                  required
                />
              </div>
              <div>
                <label className="label">পরিমাণ (৳) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                  placeholder="০"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="label">কারণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input"
                  placeholder="যেমন: জরুরি প্রয়োজন"
                />
              </div>
              <div>
                <label className="label">তারিখ *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full">
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        )}

        {editingDebt && (
          <div className="card mb-6 bg-white border-2 border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">ধার সম্পাদনা করুন</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="label">ব্যক্তির নাম *</label>
                <input
                  type="text"
                  value={editPersonName}
                  onChange={(e) => setEditPersonName(e.target.value)}
                  className="input"
                  placeholder="যেমন: আলী"
                  required
                />
              </div>
              <div>
                <label className="label">পরিমাণ (৳) *</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="input"
                  placeholder="০"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="label">কারণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="input"
                  placeholder="যেমন: জরুরি প্রয়োজন"
                />
              </div>
              <div>
                <label className="label">তারিখ *</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">
                  আপডেট করুন
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        )}

        {editingPayment && (
          <div className="card mb-6 bg-white border-2 border-green-200">
            <h2 className="text-xl font-semibold mb-4 text-green-900">পেমেন্ট সম্পাদনা করুন</h2>
            <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
              <div>
                <label className="label">পরিমাণ (৳) *</label>
                <input
                  type="number"
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(e.target.value)}
                  className="input"
                  placeholder="০"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="label">তারিখ *</label>
                <input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={editPaymentNote}
                  onChange={(e) => setEditPaymentNote(e.target.value)}
                  className="input"
                  placeholder="যেমন: আংশিক পরিশোধ"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1">
                  আপডেট করুন
                </button>
                <button
                  type="button"
                  onClick={handleCancelPaymentEdit}
                  className="btn btn-secondary"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          {activeDebts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">বাকি আছে</h2>
              <div className="space-y-3">
                {activeDebts.map((debt) => {
                  const remaining = calculateRemaining(debt)
                  const totalPaid = getTotalPaid(debt)
                  return (
                    <div key={debt.id} className="card bg-white hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1">
                            {debt.personName}
                          </h3>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <div className="text-xs text-gray-500">মোট</div>
                              <div className="text-lg font-bold text-gray-900">৳{debt.amount}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">পরিশোধিত</div>
                              <div className="text-lg font-bold text-blue-600">৳{totalPaid}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">বাকি</div>
                              <div className="text-lg font-bold text-green-600">৳{remaining}</div>
                            </div>
                          </div>
                          {debt.reason && (
                            <p className="text-gray-600 text-sm mb-2">📝 {debt.reason}</p>
                          )}
                          <div className="text-sm text-gray-500">
                            📅 {format(new Date(debt.date), 'PPP')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(debt)}
                            className="btn btn-secondary text-xs"
                            title="সম্পাদনা করুন"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleReturned(debt)}
                            className="btn btn-secondary text-xs"
                            title="ফেরত পেয়েছি"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleDelete(debt.id)}
                            className="btn btn-danger text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Payment History */}
                      {debt.payments && debt.payments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">পরিশোধের ইতিহাস:</h4>
                          <div className="space-y-1">
                            {debt.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-blue-600">৳{payment.amount}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600">{format(new Date(payment.date), 'PP')}</span>
                                  {payment.note && (
                                    <>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-500 italic">{payment.note}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleEditPayment(debt.id, payment)}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="সম্পাদনা করুন"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(debt.id, payment.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="মুছুন"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Payment Button/Form */}
                      {remaining > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {showPaymentForm === debt.id ? (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700">পেমেন্ট যোগ করুন:</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-600">পরিমাণ (৳)</label>
                                  <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="input text-sm"
                                    placeholder="০"
                                    min="0"
                                    max={remaining}
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">তারিখ</label>
                                  <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="input text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">নোট (ঐচ্ছিক)</label>
                                <input
                                  type="text"
                                  value={paymentNote}
                                  onChange={(e) => setPaymentNote(e.target.value)}
                                  className="input text-sm"
                                  placeholder="যেমন: আংশিক পরিশোধ"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddPayment(debt.id)}
                                  className="btn btn-primary text-xs flex-1"
                                >
                                  সংরক্ষণ করুন
                                </button>
                                <button
                                  onClick={() => setShowPaymentForm(null)}
                                  className="btn btn-secondary text-xs"
                                >
                                  বাতিল
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowPaymentForm(debt.id)}
                              className="btn btn-primary text-xs w-full"
                            >
                              💵 পেমেন্ট যোগ করুন
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {returnedDebts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">ফেরত পাওয়া</h2>
              <div className="space-y-3">
                {returnedDebts.map((debt) => {
                  const totalPaid = getTotalPaid(debt)
                  return (
                    <div key={debt.id} className="card bg-gray-100 opacity-75">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-700 mb-1">
                            {debt.personName}
                          </h3>
                          <div className="text-xl font-bold text-gray-600 mb-2">
                            ৳{debt.amount}
                            {totalPaid > 0 && (
                              <span className="text-sm text-blue-500 ml-2">(পরিশোধিত: ৳{totalPaid})</span>
                            )}
                          </div>
                          {debt.reason && (
                            <p className="text-gray-500 text-sm mb-2">📝 {debt.reason}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(debt)}
                            className="btn btn-secondary text-xs"
                            title="সম্পাদনা করুন"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleReturned(debt)}
                            className="btn btn-secondary text-xs"
                            title="ফেরত পাইনি"
                          >
                            ↺
                          </button>
                          <button
                            onClick={() => handleDelete(debt.id)}
                            className="btn btn-danger text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Payment History */}
                      {debt.payments && debt.payments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">পরিশোধের ইতিহাস:</h4>
                          <div className="space-y-1">
                            {debt.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between text-sm bg-gray-200 p-2 rounded">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-blue-600">৳{payment.amount}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600">{format(new Date(payment.date), 'PP')}</span>
                                  {payment.note && (
                                    <>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-500 italic">{payment.note}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleEditPayment(debt.id, payment)}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="সম্পাদনা করুন"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(debt.id, payment.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="মুছুন"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {debts.length === 0 && (
            <div className="card text-center py-12 bg-white">
              <p className="text-gray-500 text-lg mb-2">কোনো রেকর্ড নেই</p>
              <p className="text-gray-400 text-sm">উপরের &quot;+ নতুন&quot; বাটনে ক্লিক করে যোগ করুন</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

