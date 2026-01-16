
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NEW_DATA = [
    {
        oldId: 'lacer_hotel',
        day: 1,
        sort_order: 2, // Estimated, often after airport
        note: "自助入住",
        name: "入住 LACER OKINAWA",
        img_url: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/642477862.jpg?k=131ca583635cd31f95766767a778dd69511845b34c97654597e5cda151dc4bca&o=",
        details: "【重要：無人飯店】\n• 入住時間：15:00 起\n• 退房時間：11:00 前\n• 電話：03-6910-2907\n\n【入住流程】\n1. 入住前請完成「線上 Check-in」。\n2. 入口密碼：入住前1-3天會寄送到 Email。\n3. 現場用平板掃描 QR Code 辦理入住。\n4. 房間密碼：辦理完後顯示 (務必截圖！)。\n\n【設施與服務】\n• ❌ 無行李寄放 (入住前/退房後皆無法)。\n• ❌ 無停車場 (請用附近投幣式)。\n• ❌ 不提供每日清潔 (4晚以上可申請)。\n• ⚠️ 露臺桑拿遇惡劣天氣停用。",
        address: "〒900-0016 沖縄県那覇市前島3-7-7"
    },
    {
        oldId: 'riverside_chibana',
        day: 3,
        sort_order: 3, // Estimated
        note: "平板Check-in",
        name: "入住 Riverside Chibana",
        img_url: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/750613782.jpg?k=51f6b688dc7e462b9b4dad73653ebd5ce8450da2233a4480d94ae8786babf1a8&o=",
        details: "【重要：平板自助入住】\n• 入住時間：16:00–24:00 (超過午夜無客服)\n• 退房時間：10:00 前\n• 電話：050-1721-0751\n\n【入住流程】\n1. 一樓平板輸入「Check-in Code」或「預約代碼」。\n2. 代碼會於入住前一天/當天 Email 寄送。\n\n【設施與服務】\n• ❌ 無櫃檯、無行李寄放。\n• ❌ 無停車場 (請用附近投幣式)。\n• ❌ 不提供清潔 (房內有洗衣機)。",
        address: "沖縄県沖縄市知花3-19-20"
    },
    {
        oldId: 'residential_hotel',
        day: 5,
        sort_order: 4,
        note: "無電梯",
        name: "入住 Residential Hotel",
        img_url: "https://r-xx.bstatic.com/xdata/images/hotel/300x225/485319429.jpg?k=100d0d0778e2d5a67b08a4e54e78dce367359525a57a35eb60e138ab12e396c1&o=",
        details: "【重要：無電梯】\n• 入住時間：15:00–16:00 已獲同意\n• 退房時間：10:00 前\n• 電話：050-3177-2942\n• MapCode：33 157 818*06\n\n【入住流程】\n1. 填寫旅客資訊表 (Link in Email)。\n2. 入住前一天寄送自助入住方式。\n\n【設施與服務】\n• ⭕ 11:00 後可將行李放入房內。\n• ❌ 無停車場 (近美榮橋站，請用投幣停車)。\n• ❌ 無電梯，需搬行李。",
        address: "2-24-15 Kumoji, Naha"
    }
];

async function recoverHotels() {
    console.log('Recovering hotels...');

    // First, verify if they are really gone
    // We search by NAME now, because we deleted the IDs

    for (const h of NEW_DATA) {
        // Create new ID
        const newUuid = crypto.randomUUID();

        console.log(`Re-creating ${h.name}...`);

        // Insert Location
        const { data: newLoc, error: locErr } = await supabase
            .from('locations')
            .insert({
                id: newUuid,
                name: h.name,
                address: h.address,
                details: h.details,
                img_url: h.img_url
            })
            .select()
            .single();

        if (locErr) {
            console.error('Error creating location:', locErr);
            continue;
        }

        // Insert Itinerary Item
        const { error: itemErr } = await supabase
            .from('itinerary_items')
            .insert({
                day_number: h.day,
                location_id: newLoc.id,
                note: h.note,
                sort_order: h.sort_order
            });

        if (itemErr) {
            console.error('Error creating item:', itemErr);
        } else {
            console.log(`Restored ${h.name} to Day ${h.day}`);
        }
    }
}

recoverHotels();
