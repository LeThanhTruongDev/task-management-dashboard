import { createClient } from "@supabase/supabase-js"

// Check if we have valid Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const hasValidCredentials =
  supabaseUrl && supabaseAnonKey && supabaseUrl.includes("supabase.co") && supabaseAnonKey.startsWith("eyJ")

// Create client with proper error handling
export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createClient("https://demo.supabase.co", "demo-key")

export const isSupabaseConfigured = hasValidCredentials

export type Task = {
  id: string
  title: string // Đổi từ name thành title để khớp với database
  description?: string | null
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "OVERDUE"
  assignee?: string | null
  deadline?: string | null // ISO string format
  category?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export type TaskInsert = Omit<Task, "id" | "created_at" | "updated_at">
export type TaskUpdate = Partial<Omit<Task, "id" | "created_at">>
