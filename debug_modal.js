
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugModalData() {
    // Exactly the same query as in page.js
    const { data: daysData, error: daysError } = await supabase
        .from('itinerary_days')
        .select(`
            day_number,
            date_display,
            title,
            itinerary_items (
                id,
                sort_order,
                note,
                location_id,
                location:locations (
                    id,
                    name,
                    address,
                    img_url,
                    details,
                    gallery
                )
            )
        `)
        .order('day_number', { ascending: true });

    if (daysError) {
        console.error('Error:', daysError);
        return;
    }

    // Same transformation as in page.js
    const transformed = daysData.map(day => {
        const sortedItems = (day.itinerary_items || [])
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(item => {
                const loc = item.location || {};
                const dbImgUrl = loc.img_url;
                const galleryImg = (Array.isArray(loc.gallery) && loc.gallery.length > 0) ? loc.gallery[0] : null;

                console.log(`\n=== Processing: ${loc.name} ===`);
                console.log('Raw loc.img_url:', loc.img_url);
                console.log('Raw loc.gallery:', loc.gallery);
                console.log('Computed dbImgUrl:', dbImgUrl);
                console.log('Computed galleryImg:', galleryImg);
                console.log('Final img_url will be:', dbImgUrl || galleryImg);

                return {
                    ...loc,
                    img_url: dbImgUrl || galleryImg,
                    note: item.note,
                    item_id: item.id,
                    location_id: item.location_id,
                    sort_order: item.sort_order
                };
            });

        return {
            id: day.day_number,
            day_number: day.day_number,
            date_display: day.date_display,
            title: day.title,
            locations: sortedItems
        };
    });

    // Check hotels specifically
    console.log('\n\n=== FINAL CHECK: Hotels in transformed data ===');
    transformed.forEach(day => {
        day.locations.forEach(loc => {
            if (loc.name && (loc.name.includes('LACER') || loc.name.includes('Riverside') || loc.name.includes('Residential'))) {
                console.log(`\nDay ${day.day_number}: ${loc.name}`);
                console.log('  img_url property:', loc.img_url);
                console.log('  imgUrl property:', loc.imgUrl);
                console.log('  Has img_url?', !!loc.img_url);
                console.log('  Condition (img_url || imgUrl):', !!(loc.img_url || loc.imgUrl));
            }
        });
    });
}

debugModalData();
