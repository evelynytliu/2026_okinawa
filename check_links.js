
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkItineraryLinks() {
    const { data, error } = await supabase
        .from('itinerary_items')
        .select(`
            id,
            day_number,
            location_id,
            location:locations(id, name, img_url)
        `);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Itinerary Items & Linked Locations:');
    data.forEach(item => {
        const loc = item.location;
        if (loc && (loc.name.includes('LACER') || loc.name.includes('Riverside') || loc.name.includes('Residential'))) {
            console.log(`Day ${item.day_number}: Linked LocID=${item.location_id}, Name=${loc.name}, Img=${loc.img_url}`);
        }
    });
}

checkItineraryLinks();
