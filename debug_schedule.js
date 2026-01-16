
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkScheduleQuery() {
    const { data: daysData, error: daysError } = await supabase
        .from('itinerary_days')
        .select(`
            day_number,
            itinerary_items (
                id,
                location_id,
                location:locations (
                    id,
                    name,
                    img_url,
                    gallery
                )
            )
        `)
        .order('day_number', { ascending: true });

    if (daysError) {
        console.error('Error:', daysError);
        return;
    }

    console.log('--- Schedule Report ---');
    daysData.forEach(day => {
        (day.itinerary_items || []).forEach(item => {
            const loc = item.location;
            if (loc && (loc.name.includes('LACER') || loc.name.includes('Riverside') || loc.name.includes('Residential'))) {
                console.log(`Day ${day.day_number}: ${loc.name}`);
                console.log(`   - ID: ${loc.id}`);
                console.log(`   - ImgURL: ${loc.img_url}`);
                console.log(`   - Gallery: ${loc.gallery}`);
            }
        });
    });
}

checkScheduleQuery();
