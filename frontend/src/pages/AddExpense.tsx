import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks.ts';
import { addExpense } from '../store/expensesSlice.ts';
import { validateExpenseForm, type ExpenseFormErrors, type ExpenseFormInput, type ExpenseFormSplit } from '../lib/validation.ts';
import { parseRupeesToPaise, formatINR } from '../lib/money.ts';
import type { Category, Split } from '../lib/types.ts';

export function AddExpense() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const members = useAppSelector((state) => state.expenses.members);

  const todayStr = new Date().toISOString().split('T')[0] ?? '';

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(todayStr);
  const [category, setCategory] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percent'>('equal');

  // Split-specific states to prevent stale state crossover
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => members.map((m) => m.id));
  const [exactShares, setExactShares] = useState<Record<string, string>>({});
  const [percentShares, setPercentShares] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<ExpenseFormErrors>({});

  const descId = useId();
  const amountId = useId();
  const paidById = useId();
  const dateId = useId();
  const categoryId = useId();

  // Live hint calculations
  const parsedAmountPaise = parseRupeesToPaise(amount);

  let exactHint = '';
  if (splitType === 'exact') {
    let exactSumPaise = 0;
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m !== undefined) {
        const val = exactShares[m.id];
        if (val !== undefined && val.trim() !== '') {
          const paise = parseRupeesToPaise(val);
          if (paise !== null) {
            exactSumPaise += paise;
          }
        }
      }
    }
    if (parsedAmountPaise !== null) {
      const diff = parsedAmountPaise - exactSumPaise;
      if (diff > 0) {
        exactHint = `${formatINR(diff)} left to assign`;
      } else if (diff < 0) {
        exactHint = `${formatINR(-diff)} over`;
      } else {
        exactHint = 'All funds assigned';
      }
    } else {
      exactHint = `Total assigned: ${formatINR(exactSumPaise)}`;
    }
  }

  let percentHint = '';
  if (splitType === 'percent') {
    let percentSum = 0;
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m !== undefined) {
        const val = percentShares[m.id];
        if (val !== undefined && val.trim() !== '') {
          const num = parseFloat(val);
          if (Number.isFinite(num)) {
            percentSum += num;
          }
        }
      }
    }
    const roundedSum = Math.round(percentSum * 100) / 100;
    const diffPct = Math.round((100 - roundedSum) * 100) / 100;
    if (diffPct > 0) {
      percentHint = `${diffPct}% remaining`;
    } else if (diffPct < 0) {
      percentHint = `${Math.round((-diffPct) * 100) / 100}% over`;
    } else {
      percentHint = '100% assigned';
    }
  }

  const handleSplitTypeChange = (newType: 'equal' | 'exact' | 'percent') => {
    setSplitType(newType);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.split;
      return next;
    });
  };

  const handleEqualToggle = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const handleExactChange = (memberId: string, value: string) => {
    setExactShares((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const handlePercentChange = (memberId: string, value: string) => {
    setPercentShares((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const buildSplitData = (): Split | ExpenseFormSplit => {
    if (splitType === 'equal') {
      return {
        type: 'equal',
        memberIds: selectedMemberIds,
      };
    }
    if (splitType === 'exact') {
      return {
        type: 'exact',
        shares: exactShares,
      };
    }
    return {
      type: 'percent',
      shares: percentShares,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const splitData = buildSplitData();
    const formInput: ExpenseFormInput = {
      description,
      amount,
      paidBy,
      date,
      category,
      split: splitData,
    };

    const validationErrors = validateExpenseForm(formInput, members, todayStr);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const amountPaise = parseRupeesToPaise(amount);
    if (amountPaise === null) {
      return;
    }

    let finalSplit: Split;
    if (splitType === 'equal') {
      finalSplit = {
        type: 'equal',
        memberIds: selectedMemberIds,
      };
    } else if (splitType === 'exact') {
      const shares: Record<string, number> = {};
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        if (m !== undefined) {
          const val = exactShares[m.id];
          if (val !== undefined && val.trim() !== '') {
            const paise = parseRupeesToPaise(val);
            if (paise !== null) {
              shares[m.id] = paise;
            }
          }
        }
      }
      finalSplit = {
        type: 'exact',
        shares,
      };
    } else {
      const shares: Record<string, number> = {};
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        if (m !== undefined) {
          const val = percentShares[m.id];
          if (val !== undefined && val.trim() !== '') {
            const pct = parseFloat(val);
            if (Number.isFinite(pct)) {
              shares[m.id] = pct;
            }
          }
        }
      }
      finalSplit = {
        type: 'percent',
        shares,
      };
    }

    const cat: Category =
      category === 'Food' ||
      category === 'Travel' ||
      category === 'Stay' ||
      category === 'Activities' ||
      category === 'Other'
        ? category
        : 'Other';

    dispatch(
      addExpense({
        description: description.trim(),
        amount: amountPaise,
        paidBy,
        date,
        category: cat,
        split: finalSplit,
      }),
    );

    navigate('/', { state: { flash: 'Expense added' } });
  };

  return (
    <div className="page-container">
      <h1>Add expense</h1>
      <form onSubmit={handleSubmit} noValidate className="expense-form">
        <div className="form-group">
          <label htmlFor={descId}>Description</label>
          <input
            id={descId}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? `${descId}-error` : undefined}
          />
          {errors.description && (
            <span id={`${descId}-error`} role="alert" className="error-text">
              {errors.description}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={amountId}>Amount (₹)</label>
          <input
            id={amountId}
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? `${amountId}-error` : undefined}
          />
          {errors.amount && (
            <span id={`${amountId}-error`} role="alert" className="error-text">
              {errors.amount}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={paidById}>Paid by</label>
          <select
            id={paidById}
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            aria-invalid={Boolean(errors.paidBy)}
            aria-describedby={errors.paidBy ? `${paidById}-error` : undefined}
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {errors.paidBy && (
            <span id={`${paidById}-error`} role="alert" className="error-text">
              {errors.paidBy}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={dateId}>Date</label>
          <input
            id={dateId}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? `${dateId}-error` : undefined}
          />
          {errors.date && (
            <span id={`${dateId}-error`} role="alert" className="error-text">
              {errors.date}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={categoryId}>Category</label>
          <select
            id={categoryId}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? `${categoryId}-error` : undefined}
          >
            <option value="">Select category</option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Stay">Stay</option>
            <option value="Activities">Activities</option>
            <option value="Other">Other</option>
          </select>
          {errors.category && (
            <span id={`${categoryId}-error`} role="alert" className="error-text">
              {errors.category}
            </span>
          )}
        </div>

        <fieldset className="form-group split-group">
          <legend>Split type</legend>
          <div className="radio-options">
            <label className="radio-label">
              <input
                type="radio"
                name="splitType"
                value="equal"
                checked={splitType === 'equal'}
                onChange={() => handleSplitTypeChange('equal')}
              />
              Equally
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="splitType"
                value="exact"
                checked={splitType === 'exact'}
                onChange={() => handleSplitTypeChange('exact')}
              />
              Exact amounts
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="splitType"
                value="percent"
                checked={splitType === 'percent'}
                onChange={() => handleSplitTypeChange('percent')}
              />
              Percentages
            </label>
          </div>

          {errors.split && (
            <div role="alert" className="error-text split-error">
              {errors.split}
            </div>
          )}

          {splitType === 'equal' && (
            <div className="equal-split-members">
              <p className="split-instruction">Select members included in this equal split:</p>
              {members.map((m) => (
                <label key={m.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(m.id)}
                    onChange={() => handleEqualToggle(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          )}

          {splitType === 'exact' && (
            <div className="exact-split-members">
              <p className="split-instruction">Specify exact rupee amount for each participant:</p>
              {exactHint && <div className="split-hint">{exactHint}</div>}
              {members.map((m) => (
                <div key={m.id} className="member-share-row">
                  <label htmlFor={`exact-share-${m.id}`}>{m.name}</label>
                  <input
                    id={`exact-share-${m.id}`}
                    type="text"
                    placeholder="₹ 0.00"
                    value={exactShares[m.id] ?? ''}
                    onChange={(e) => handleExactChange(m.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {splitType === 'percent' && (
            <div className="percent-split-members">
              <p className="split-instruction">Specify percentage for each participant:</p>
              {percentHint && <div className="split-hint">{percentHint}</div>}
              {members.map((m) => (
                <div key={m.id} className="member-share-row">
                  <label htmlFor={`percent-share-${m.id}`}>{m.name}</label>
                  <input
                    id={`percent-share-${m.id}`}
                    type="text"
                    placeholder="0%"
                    value={percentShares[m.id] ?? ''}
                    onChange={(e) => handlePercentChange(m.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
