import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MerchantSuggestion } from '@/db/repositories'
import type { Category, PaymentInput } from '@/db/schema'
import { CategoryIcon } from '@/features/spending/category-icon'
import { paymentFormSchema, type PaymentFormValues } from '@/features/spending/payment-form-schema'
import { addDaysToKey, todayKey } from '@/lib/dates'
import { currencySymbol } from '@/lib/money'
import { cn } from '@/lib/utils'

export const PAYMENT_FORM_ID = 'payment-form'

interface PaymentFormProps {
  defaultValues: PaymentFormValues
  currency: string
  categories: Category[]
  merchants: MerchantSuggestion[]
  onSubmit: (input: PaymentInput) => void | Promise<void>
}

const MAX_SUGGESTIONS = 6

const chip =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
const chipIdle = 'border-border bg-card text-foreground hover:bg-muted'
const chipActive = 'border-transparent bg-foreground text-background'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  )
}

/** Amount → category → merchant → date → note. The Save button lives in the sheet footer. */
export function PaymentForm({
  defaultValues,
  currency,
  categories,
  merchants,
  onSubmit,
}: PaymentFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PaymentFormValues, unknown, PaymentInput>({
    defaultValues,
    resolver: zodResolver(paymentFormSchema(currency)),
  })
  const [showNotes, setShowNotes] = useState(defaultValues.notes !== '')
  const merchant = useWatch({ control, name: 'merchant' })
  const date = useWatch({ control, name: 'date' })

  const today = todayKey()
  const yesterday = addDaysToKey(today, -1)

  const query = merchant.trim().toLowerCase()
  const suggestions = merchants
    .filter((m) => {
      const name = m.merchant.toLowerCase()
      return name !== query && (query === '' || name.includes(query))
    })
    .slice(0, MAX_SUGGESTIONS)

  function pickMerchant(suggestion: MerchantSuggestion) {
    setValue('merchant', suggestion.merchant, { shouldDirty: true })
    // Saves a tap when the merchant decides the category, without overriding a choice.
    if (!getValues('categoryId') && categories.some((c) => c.id === suggestion.categoryId)) {
      setValue('categoryId', suggestion.categoryId, { shouldDirty: true, shouldValidate: true })
    }
  }

  return (
    <form
      id={PAYMENT_FORM_ID}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <div>
        <Label htmlFor="amount" className="sr-only">
          Amount
        </Label>
        <div className="flex items-baseline gap-2 border-b-2 border-border pb-2 focus-within:border-spending has-aria-invalid:border-destructive">
          <span className="font-heading text-2xl font-medium text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="0"
            autoFocus
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
            className="tabular w-full min-w-0 bg-transparent font-heading text-[2.75rem]! leading-none font-semibold outline-none placeholder:text-muted-foreground/50"
            {...register('amount')}
          />
        </div>
        <FieldError id="amount-error" message={errors.amount?.message} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-label="Category"
              aria-invalid={!!errors.categoryId}
              aria-describedby={errors.categoryId ? 'category-error' : undefined}
              className="grid grid-cols-3 gap-2"
            >
              {categories.map((category) => {
                const selected = field.value === category.id
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(category.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-foreground bg-card'
                        : 'border-transparent bg-card/60 text-muted-foreground hover:bg-card',
                    )}
                  >
                    <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                    <span className={cn('max-w-full truncate', selected && 'text-foreground')}>
                      {category.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        />
        <FieldError id="category-error" message={errors.categoryId?.message} />
      </fieldset>

      <div>
        <Label htmlFor="merchant" className="mb-2">
          Merchant or description
        </Label>
        <Input
          id="merchant"
          placeholder="Optional"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          className="h-11 rounded-xl bg-card"
          aria-invalid={!!errors.merchant}
          {...register('merchant')}
        />
        {suggestions.length > 0 && (
          <div
            aria-label="Recent merchants"
            className="-mx-5 mt-2 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1"
          >
            {suggestions.map((s) => (
              <button
                key={s.merchant}
                type="button"
                onClick={() => pickMerchant(s)}
                className={cn(chip, chipIdle)}
              >
                {s.merchant}
              </button>
            ))}
          </div>
        )}
        <FieldError id="merchant-error" message={errors.merchant?.message} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Date</legend>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: today, label: 'Today' },
            { value: yesterday, label: 'Yesterday' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={date === option.value}
              onClick={() => setValue('date', option.value, { shouldDirty: true })}
              className={cn(chip, date === option.value ? chipActive : chipIdle)}
            >
              {option.label}
            </button>
          ))}
          <Label htmlFor="date" className="sr-only">
            Pick a date
          </Label>
          <input
            id="date"
            type="date"
            max={today}
            className={cn(
              chip,
              'min-w-0 text-base',
              date !== today && date !== yesterday ? chipActive : chipIdle,
            )}
            {...register('date')}
          />
        </div>
        <FieldError id="date-error" message={errors.date?.message} />
      </fieldset>

      {showNotes ? (
        <div>
          <Label htmlFor="notes" className="mb-2">
            Note
          </Label>
          <Textarea
            id="notes"
            rows={3}
            autoFocus={defaultValues.notes === ''}
            className="rounded-xl bg-card"
            {...register('notes')}
          />
          <FieldError id="notes-error" message={errors.notes?.message} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Add a note
        </button>
      )}
    </form>
  )
}
