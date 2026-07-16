import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://cqsxqjakdnvgcpkqyadj.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IYA4_sjs0ImzwNHCtBvvTQ_DyjcwQHe'

export const supabase = createClient(url, key)
