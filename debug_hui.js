const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function analyzeHuiAndLin() {
    const { data: expenses, error } = await supabase.from('expenses').select('*');
    if (error) { console.error(error); return; }

    const hui = { paid: 0, share: 0, net: 0, logs: [] };
    const lin = { paid: 0, share: 0, net: 0, logs: [] };
    const mei = { paid: 0, share: 0, net: 0, logs: [] };

    const check = (id, obj) => {
        // Basic stats
    };

    expenses.forEach(exp => {
        const amt = Number(exp.amount) || 0;
        const payer = exp.payer_id;
        const bens = exp.beneficiaries || [];
        const isRepayment = exp.category === 'repayment';

        // Logic duplicating page.js with includeUnpaid = TRUE
        // If includeUnpaid is true, we process 'none' payers too.
        const effectivePayer = (payer === 'none') ? 'none' : payer;

        if (effectivePayer === 'hui') {
            hui.paid += amt;
            hui.logs.push(`PAID: ${exp.title} (${amt})`);
        } else if (effectivePayer === 'lin') {
            lin.paid += amt;
            lin.logs.push(`PAID: ${exp.title} (${amt})`);
        } else if (effectivePayer === 'mei') {
            mei.paid += amt;
            mei.logs.push(`PAID: ${exp.title} (${amt})`);
        }

        if (isRepayment) {
            // Payer paid, Beneficiary received (share reduction? No, balance reduction)
            // In page.js:
            // if (personBalances[bid]) { personBalances[bid].paid -= amt; }
            // Wait, page.js repayment logic:
            // payer.paid += amt;
            // ben.paid -= amt; (Logic: Ben effectively "paid back", so we reduce their 'paid' credit? No.)
            // Let's re-read page.js logic.
            /*
            if (isRepayment) {
                if (personBalances[payer]) {
                    personBalances[payer].paid += amt;
                }
                beneficiaries.forEach(bid => {
                    if (personBalances[bid]) {
                        personBalances[bid].paid -= amt;
                    }
                });
            }
            */
            // If Payer (A) pays Beneficiary (B):
            // A.paid += 100. (A is creditor +100).
            // B.paid -= 100. (B is debtor -100).
            // Net: A+100, B-100.
            // This represents A GIVING money to B?
            // Usually repayment is Debtor GIVING money to Creditor.
            // Only if `payer` is the one initiating transaction.
            // If Hui (Debtor) transfers 100 to Lin (Creditor).
            // Payer: Hui. Beneficiary: Lin.
            // Hui.paid += 100. (Hui gets credit).
            // Lin.paid -= 100. (Lin credit reduced, i.e., she got paid).
            // This matches page.js logic.

            if (bens.includes('hui')) {
                // Someone paid money TO Hui?
                if (effectivePayer === 'lin') console.log(`Lin Repaid/Transferred TO Hui: ${amt}`);
                hui.paid -= amt;
                hui.logs.push(`RECEIVED REPAY: ${exp.title} (-${amt}) from ${effectivePayer}`);
            }
            if (bens.includes('lin')) {
                lin.paid -= amt;
                lin.logs.push(`RECEIVED REPAY: ${exp.title} (-${amt}) from ${effectivePayer}`);
            }
        } else {
            // Normal split
            if (bens.length > 0) {
                const split = amt / bens.length;
                if (bens.includes('hui')) {
                    hui.share += split;
                    hui.logs.push(`SHARE: ${exp.title} (${split}) Payer: ${effectivePayer}`);
                }
                if (bens.includes('lin')) {
                    lin.share += split;
                    lin.logs.push(`SHARE: ${exp.title} (${split}) Payer: ${effectivePayer}`);
                }
                if (bens.includes('mei')) {
                    mei.share += split;
                    mei.logs.push(`SHARE: ${exp.title} (${split}) Payer: ${effectivePayer}`);
                }
            }
        }
    });

    hui.net = hui.paid - hui.share;
    lin.net = lin.paid - lin.share;
    mei.net = mei.paid - mei.share;

    console.log('--- HUI ---');
    console.log(`Paid: ${hui.paid}, Share: ${hui.share}, Net: ${hui.net}`);
    // console.log(hui.logs);

    console.log('--- LIN ---');
    console.log(`Paid: ${lin.paid}, Share: ${lin.share}, Net: ${lin.net}`);

    console.log('--- MEI ---');
    console.log(`Paid: ${mei.paid}, Share: ${mei.share}, Net: ${mei.net}`);
}

analyzeHuiAndLin();
