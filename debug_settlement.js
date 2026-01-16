const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSettlement() {
    const { data: expenses, error } = await supabase.from('expenses').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total Expenses: ${expenses.length}`);

    let totalPaid = 0;
    let totalShare = 0;
    const payerTotals = {};

    expenses.forEach(exp => {
        const amt = Number(exp.amount) || 0;
        const payer = exp.payer_id;
        const bens = exp.beneficiaries || [];

        console.log(`[${exp.title}] Amt: ${amt}, Payer: ${payer}, Bens: ${bens.length}`);

        if (payer) {
            payerTotals[payer] = (payerTotals[payer] || 0) + amt;
            totalPaid += amt;
        }

        if (bens.length > 0) {
            totalShare += amt;
        } else {
            console.warn(`  WARNING: No beneficiaries for ${exp.title}`);
        }
    });

    console.log('--- Summary ---');
    console.log(`Total Paid Tracked: ${totalPaid}`);
    console.log(`Total Share Tracked: ${totalShare}`);
    console.log('Payer Totals:', payerTotals);
}

debugSettlement();
