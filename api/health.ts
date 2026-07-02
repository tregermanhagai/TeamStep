import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return res.status(503).json({
      status: 'error',
      db: 'disconnected',
      error: 'Missing Supabase environment variables',
    })
  }

  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.rpc('health_check')

    if (error) {
      return res.status(503).json({
        status: 'error',
        db: 'disconnected',
        error: error.message,
      })
    }

    return res.status(200).json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      db: 'disconnected',
      error: err?.message ?? 'Unknown error',
    })
  }
}
