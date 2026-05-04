import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: data2, error: error2 } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Last messages:', JSON.stringify(data2, null, 2))
}

run()
