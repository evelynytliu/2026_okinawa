
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const HOTELS_TO_UPDATE = {
    "lacer_hotel": {
        name: "入住 LACER OKINAWA",
        img_url: "/images/lacer_hotel.jpg",
        details: "【重要：無人飯店】\n• 入住時間：15:00 起\n• 退房時間：11:00 前\n• 電話：03-6910-2907\n\n【入住流程】\n1. 入住前請完成「線上 Check-in」。\n2. 入口密碼：入住前1-3天會寄送到 Email。\n3. 現場用平板掃描 QR Code 辦理入住。\n4. 房間密碼：辦理完後顯示 (務必截圖！)。\n\n【設施與服務】\n• ❌ 無行李寄放 (入住前/退房後皆無法)。\n• ❌ 無停車場 (請用附近投幣式)。\n• ❌ 不提供每日清潔 (4晚以上可申請)。\n• ⚠️ 露臺桑拿遇惡劣天氣停用。",
    },
    "riverside_chibana": {
        name: "入住 Riverside Chibana",
        img_url: "/images/riverside_chibana.jpg",
        details: "【重要：平板自助入住】\n• 入住時間：16:00–24:00 (超過午夜無客服)\n• 退房時間：10:00 前\n• 電話：050-1721-0751\n\n【入住流程】\n1. 一樓平板輸入「Check-in Code」或「預約代碼」。\n2. 代碼會於入住前一天/當天 Email 寄送。\n\n【設施與服務】\n• ❌ 無櫃檯、無行李寄放。\n• ❌ 無停車場 (請用附近投幣式)。\n• ❌ 不提供清潔 (房內有洗衣機)。",
    },
    "residential_hotel": {
        name: "入住 Residential Hotel",
        img_url: "/images/residential_hotel.jpg",
        details: "【重要：無電梯】\n• 入住時間：15:00–16:00 已獲同意\n• 退房時間：10:00 前\n• 電話：050-3177-2942\n• MapCode：33 157 818*06\n\n【入住流程】\n1. 填寫旅客資訊表 (Link in Email)。\n2. 入住前一天寄送自助入住方式。\n\n【設施與服務】\n• ⭕ 11:00 後可將行李放入房內。\n• ❌ 無停車場 (近美榮橋站，請用投幣停車)。\n• ❌ 無電梯，需搬行李。",
    }
};

async function updateHotels() {
    console.log('Starting refresh...');

    for (const [id, data] of Object.entries(HOTELS_TO_UPDATE)) {
        console.log(`Updating ${data.name}...`);

        // Update both details and img_url
        let { data: updated, error } = await supabase
            .from('locations')
            .update({
                details: data.details,
                img_url: data.img_url
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error(`Error updating ${data.name}:`, error);
        } else {
            console.log(`Successfully refreshed ${data.name}.`);
        }
    }

    console.log('Done.');
}

updateHotels();
