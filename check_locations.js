
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listLocations() {
    const { data, error } = await supabase
        .from('locations')
        .select('id, name, img_url');

    if (error) {
        console.error('Error fetching locations:', error);
        return;
    }

    console.log('Current Locations in DB:');
    data.forEach(loc => {
        if (loc.name.includes('LACER') || loc.name.includes('Riverside') || loc.name.includes('Residential')) {
            console.log(`ID: ${loc.id}, Name: ${loc.name}, Img: ${loc.img_url}`);
        }
    });
}

listLocations();
