require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are missing');
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    realtime: {
      transport: WebSocket,
    },
  }
);

module.exports = supabase;