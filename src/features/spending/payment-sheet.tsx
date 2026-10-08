import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { FormSheet } from '@/components/common/form-sheet'
import { Button } from '@/components/ui/button'
import { repositories } from '@/db'
import type { Payment, PaymentInput } from '@/db/schema'
import { useCategories, useCurrency, useRecentMerchants } from '@/hooks/use-data'
import { useCloseRoute } from '@/hooks/use-close-route'
import { PAYMENT_FORM_ID, PaymentForm } from '@/features/spending/payment-form'
import {
  emptyPaymentForm,
  paymentToForm,
  paymentToInput,
} from '@/features/spending/payment-form-schema'

/** /spending/new and /spending/:id, shown as a sheet over the Spending page. */
export function PaymentSheet() {
  const { id } = useParams()
  const close = useCloseRoute('/spending')
  const currency = useCurrency()
  const merchants = useRecentMerchants()
  // Archived categories stay selectable only for a payment that already uses one.
  const allCategories = useCategories({ includeArchived: true })
  // null = not found, undefined = still loading.
  const payment = useLiveQuery(
    async () => (id ? ((await repositories.payments.getById(id)) ?? null) : null),
    [id],
  )
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isEdit = id !== undefined
  const loading = allCategories === undefined || merchants === undefined || payment === undefined
  const categories = (allCategories ?? []).filter(
    (c) => !c.archived || (payment && c.id === payment.categoryId),
  )

  async function save(input: PaymentInput) {
    setSaving(true)
    try {
      if (payment) await update(payment, input)
      else await create(input)
      close()
    } catch (error) {
      toast.error('Couldn’t save the payment', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  async function remove(target: Payment) {
    await repositories.payments.remove(target.id)
    toast.success('Payment deleted')
    close()
  }

  const title = isEdit ? 'Edit payment' : 'Add payment'

  return (
    <FormSheet
      open
      onOpenChange={(open) => !open && close()}
      title={title}
      footer={
        payment !== null || !isEdit ? (
          <div className="flex gap-2">
            {payment && (
              <ConfirmDelete
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete this payment?"
                onConfirm={() => remove(payment)}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-lg"
                    className="size-12 rounded-full"
                    aria-label="Delete payment"
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </Button>
                }
              />
            )}
            <Button
              type="submit"
              form={PAYMENT_FORM_ID}
              disabled={loading || saving}
              className="h-12 flex-1 rounded-full bg-spending text-base text-white hover:bg-spending/90"
            >
              {isEdit ? 'Save changes' : 'Save payment'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="h-96" aria-busy="true" />
      ) : isEdit && payment === null ? (
        <p className="py-10 text-center text-muted-foreground">
          This payment doesn’t exist anymore. It may have been deleted.
        </p>
      ) : (
        <PaymentForm
          key={payment?.id ?? 'new'}
          defaultValues={payment ? paymentToForm(payment, currency) : emptyPaymentForm()}
          currency={currency}
          categories={categories}
          merchants={merchants}
          onSubmit={save}
        />
      )}
    </FormSheet>
  )
}

async function create(input: PaymentInput) {
  const created = await repositories.payments.create(input)
  toast.success('Payment added', {
    action: { label: 'Undo', onClick: () => void repositories.payments.remove(created.id) },
  })
}

async function update(previous: Payment, input: PaymentInput) {
  await repositories.payments.update(previous.id, input)
  toast.success('Changes saved', {
    action: {
      label: 'Undo',
      onClick: () => void repositories.payments.update(previous.id, paymentToInput(previous)),
    },
  })
}
