import type { Sleep } from '@/db/schema'
import {
  emptySleepForm,
  previewDuration,
  sleepFormSchema,
  sleepToForm,
  type SleepFormValues,
} from '@/features/sleep/sleep-form-schema'

const today = '2026-10-08'
const values = (overrides: Partial<SleepFormValues> = {}): SleepFormValues => ({
  date: today,
  bedtime: '23:30',
  wakeTime: '07:00',
  quality: null,
  notes: '',
  ...overrides,
})

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((i) => i.message) ?? []
}

describe('sleepFormSchema', () => {
  const schema = sleepFormSchema({ loggedNights: new Map([['2026-10-07', 'taken']]), today })

  it('turns picked times into full date-times across midnight', () => {
    expect(schema.parse(values({ quality: 4, notes: ' late coffee ' }))).toEqual({
      date: today,
      bedtime: '2026-10-07T23:30',
      wakeTime: '2026-10-08T07:00',
      quality: 4,
      notes: 'late coffee',
    })
  })

  it('keeps bedtimes after midnight on the same day', () => {
    expect(schema.parse(values({ bedtime: '01:15' }))).toMatchObject({
      bedtime: '2026-10-08T01:15',
      wakeTime: '2026-10-08T07:00',
    })
  })

  it('leaves optional fields out when empty', () => {
    const parsed = schema.parse(values())
    expect(parsed.quality).toBeUndefined()
    expect(parsed.notes).toBeUndefined()
  })

  it('rejects a night that is already logged, unless it is the one being edited', () => {
    expect(messages(schema.safeParse(values({ date: '2026-10-07' })))).toEqual([
      'This night is already logged',
    ])
    const editing = sleepFormSchema({
      loggedNights: new Map([['2026-10-07', 'taken']]),
      editingId: 'taken',
      today,
    })
    expect(editing.safeParse(values({ date: '2026-10-07' })).success).toBe(true)
  })

  it('rejects future nights, missing times and identical times', () => {
    expect(messages(schema.safeParse(values({ date: '2026-10-09' })))).toEqual([
      'That night hasn’t happened yet',
    ])
    expect(messages(schema.safeParse(values({ bedtime: '', wakeTime: '' })))).toEqual([
      'Pick a bedtime',
      'Pick a wake time',
    ])
    expect(messages(schema.safeParse(values({ bedtime: '07:00' })))).toEqual([
      'Bedtime and wake time can’t be the same',
    ])
  })
})

describe('previewDuration', () => {
  it('measures across midnight', () => {
    expect(previewDuration('23:30', '07:00')).toBe(450)
    expect(previewDuration('01:00', '07:00')).toBe(360)
  })

  it('is null while incomplete or identical', () => {
    expect(previewDuration('', '07:00')).toBeNull()
    expect(previewDuration('07:00', '07:00')).toBeNull()
  })
})

describe('form defaults', () => {
  const latest: Sleep = {
    id: 's1',
    date: '2026-10-06',
    bedtime: '2026-10-06T00:45',
    wakeTime: '2026-10-06T08:15',
    quality: 3,
    notes: 'noisy',
    createdAt: 1,
    updatedAt: 1,
  }

  it('starts from 23:00 to 07:00, or the latest entry’s times', () => {
    expect(emptySleepForm(today)).toMatchObject({ bedtime: '23:00', wakeTime: '07:00' })
    expect(emptySleepForm(today, latest)).toEqual({
      date: today,
      bedtime: '00:45',
      wakeTime: '08:15',
      quality: null,
      notes: '',
    })
  })

  it('round-trips an entry', () => {
    const schema = sleepFormSchema({ loggedNights: new Map(), editingId: 's1', today })
    expect(schema.parse(sleepToForm(latest))).toEqual({
      date: latest.date,
      bedtime: latest.bedtime,
      wakeTime: latest.wakeTime,
      quality: 3,
      notes: 'noisy',
    })
  })
})
