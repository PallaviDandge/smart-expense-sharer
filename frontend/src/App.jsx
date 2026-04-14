import { useCallback, useEffect, useMemo, useState } from 'react'
import { SPLIT_TYPE } from './constants'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function fetchJson(path, options) {
  const url = `${API_BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'content-type': 'application/json' },
    ...options,
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!res.ok) {
    const msg = body && typeof body.error === 'string' ? body.error : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return body
}

function parseCommaSeparatedNames(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export default function App() {
  const [payerName, setPayerName] = useState('Alice')
  const [participantCsv, setParticipantCsv] = useState('Alice, Bob, Charlie')
  const [totalAmount, setTotalAmount] = useState('1200')
  const [splitType, setSplitType] = useState(SPLIT_TYPE.EQUAL)
  const [description, setDescription] = useState('Dinner')
  const [unequalByName, setUnequalByName] = useState({})

  const [expenses, setExpenses] = useState([])
  const [expensesOffset, setExpensesOffset] = useState(0)
  const [expensesLimit] = useState(10)
  const [expensesTotalPages, setExpensesTotalPages] = useState(1)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [balances, setBalances] = useState(null)
  const [settlements, setSettlements] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const participantNames = useMemo(
    () => parseCommaSeparatedNames(participantCsv),
    [participantCsv]
  )

  const reloadAll = useCallback(async () => {
    const [list, bal, settle] = await Promise.all([
      fetchJson(`/api/expenses?offset=${expensesOffset}&limit=${expensesLimit}`),
      fetchJson('/api/balances'),
      fetchJson('/api/settlements'),
    ])
    setExpenses(list?.items || [])
    setExpensesOffset(list?.offset || 0)
    setExpensesTotalPages(list?.totalPages || 1)
    setExpensesTotal(list?.total || 0)
    setBalances(bal)
    setSettlements(settle)
  }, [expensesLimit, expensesOffset])

  useEffect(() => {
    reloadAll().catch(() => {})
  }, [reloadAll])

  useEffect(() => {
    if (splitType !== SPLIT_TYPE.UNEQUAL) return
    setUnequalByName((prev) => {
      const next = { ...prev }
      for (const name of participantNames) {
        if (next[name] === undefined) next[name] = ''
      }
      for (const key of Object.keys(next)) {
        if (!participantNames.includes(key)) delete next[key]
      }
      return next
    })
  }, [splitType, participantNames])

  async function handleSubmitExpense(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await fetchJson('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          payerName,
          participantNames,
          totalAmount,
          splitType,
          splits: splitType === SPLIT_TYPE.UNEQUAL ? unequalByName : undefined,
          description,
        }),
      })
      setExpensesOffset(0)
      await reloadAll()
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteExpense(id) {
    setError('')
    setBusy(true)
    try {
      await fetchJson(`/api/expenses/${id}`, { method: 'DELETE' })
      await reloadAll()
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  function handleRefreshClick() {
    reloadAll().catch((err) => setError(err.message || 'Failed'))
  }

  function goPrevPage() {
    setExpensesOffset((o) => Math.max(0, o - expensesLimit))
  }

  function goNextPage() {
    setExpensesOffset((o) => {
      const next = o + expensesLimit
      const maxOffset = Math.max(0, (expensesTotalPages - 1) * expensesLimit)
      return Math.min(maxOffset, next)
    })
  }

  const owesList = balances && Array.isArray(balances.owes) ? balances.owes : []
  const settlementList =
    settlements && Array.isArray(settlements.settlements) ? settlements.settlements : []

  return (
    <div className="min-h-full bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Smart Expense Sharing</h1>
            <p className="mt-1 text-sm text-gray-600">Add expenses, view balances, optimized settlements</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleRefreshClick}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="font-semibold text-red-900">Error</div>
            <div className="mt-1 text-sm text-red-800">{error}</div>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-blue-100 bg-white/70 p-4 shadow-lg backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold">Add expense</div>
              <form onSubmit={handleSubmitExpense} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Payer name</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                    />
                    <div className="mt-1 text-xs text-gray-500">Payer must appear in participants.</div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">Participants (comma separated)</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={participantCsv}
                      onChange={(e) => setParticipantCsv(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Total amount (₹)</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Split type</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={splitType}
                      onChange={(e) => setSplitType(e.target.value)}
                    >
                      <option value={SPLIT_TYPE.EQUAL}>EQUAL</option>
                      <option value={SPLIT_TYPE.UNEQUAL}>UNEQUAL</option>
                    </select>
                  </div>
                </div>

                {splitType === SPLIT_TYPE.UNEQUAL ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm font-bold text-gray-800">Amount per person (₹)</div>
                    <div className="mt-2 space-y-2">
                      {participantNames.map((name) => (
                        <div key={name}>
                          <div className="text-xs font-semibold text-gray-700">{name}</div>
                          <input
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            value={unequalByName[name] ?? ''}
                            onChange={(e) => setUnequalByName((prev) => ({ ...prev, [name]: e.target.value }))}
                            placeholder="100.00"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Must sum exactly to total.</div>
                  </div>
                ) : null}

                <div>
                  <label className="text-xs font-semibold text-gray-700">Description (optional)</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Create expense
                  </button>
                </div>
              </form>
              </div>
            </div>

            <div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-base font-extrabold">Balances</div>
                {owesList.length > 0 ? (
                  <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
                    {owesList.map((row, index) => (
                      <div key={`${row.text}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                        {row.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-gray-600">No balances yet.</div>
                )}

                <div className="mt-6 text-base font-extrabold">Optimized settlements</div>
                {settlementList.length > 0 ? (
                  <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
                    {settlementList.map((row, index) => (
                      <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                        {row.from} to {row.to} ₹{row.amount}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-gray-600">Nothing to settle.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4">
            <div className="text-base font-extrabold">All expenses</div>
            <div className="text-sm text-gray-600">{expensesTotal} total</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-t border-gray-200 text-left text-sm">
              <thead className="bg-gray-200">
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-5 py-3">Payer</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Split</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Participants</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    {/* <td className="whitespace-nowrap px-5 py-3 font-semibold text-gray-900">#{expense.id}</td> */}
                    <td className="px-5 py-3 text-gray-800">{expense.payer}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-gray-900">₹{expense.totalAmount}</td>
                    <td className="px-5 py-3 text-gray-800">{expense.splitType}</td>
                    <td className="px-5 py-3 text-gray-800">{expense.description || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(expense.participants || []).map((p) => (
                          <span
                            key={p.name}
                            className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                          >
                            {p.name}: ₹{p.amount}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDeleteExpense(expense.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center text-sm text-gray-600">
                      No expenses created.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {expensesTotal > expensesLimit ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="text-sm text-gray-600">
                Page{' '}
                <span className="font-semibold text-gray-900">
                  {Math.floor(expensesOffset / expensesLimit) + 1}
                </span>{' '}
                of <span className="font-semibold text-gray-900">{expensesTotalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || expensesOffset <= 0}
                  onClick={goPrevPage}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={busy || expensesOffset >= (expensesTotalPages - 1) * expensesLimit}
                  onClick={goNextPage}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
