/**
 * Domain types for Expenso / SmallSpend.
 *
 * Aligned with the REAL Supabase schema (verified from the SQL editor).
 * Enum-valued columns are typed as `string` because the exact enum members
 * have NOT been verified. Do not assume values beyond those documented.
 */

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  created_at: string
}

export interface Device {
  id: string
  user_id: string
  device_name: string | null
  is_active: boolean
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface SmsEvent {
  id: string
  user_id: string
  device_id: string | null
  sender: string | null
  raw_message: string
  received_at: string
  status: string
  processing_error: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  device_id: string | null
  sms_event_id: string | null
  amount: number
  transaction_type: string
  payment_method: string
  merchant_name: string | null
  merchant_raw: string | null
  category_id: string | null
  bank_name: string | null
  account_last4: string | null
  transaction_reference: string | null
  transaction_at: string | null
  confidence: number | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}
