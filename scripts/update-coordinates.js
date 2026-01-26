/**
 * Script to batch update coordinates for locations missing lat/lng
 * Run with: node scripts/update-coordinates.js YOUR_GEMINI_API_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lqjqxfybwwxuvmrfxigl.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxanF4Znlid3d4dXZtcmZ4aWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3OTE3MzAsImV4cCI6MjA1MzM2NzczMH0.0mfDnpA-vrLAboeK0BFYwfvnKSsDmMkbKNJNiU3CT9c';

// Available Gemini models in priority order (fallback chain)
const GEMINI_MODELS = [
    'gemini-2.5-flash',      // Primary model
    'gemini-3-flash',        // Fallback 1
    'gemini-2.5-flash-lite', // Fallback 2
];

// Rate limit error patterns to detect when to switch models
const RATE_LIMIT_PATTERNS = [
    'RESOURCE_EXHAUSTED',
    'rate limit',
    'quota exceeded',
    'too many requests',
    '429',
    'limit exceeded',
];

async function fetchPlaceDetails(placeName, apiKey) {
    const prompt = `
    你是沖繩旅遊助手。請查詢地點「${placeName}」的座標資訊。
    
    ⚠️ 重要規則 - 禁止幻覺：
    - 只提供你確實知道且有信心的座標
    - 如果不確定，請填 null
    - 絕對不要編造座標
    
    回傳純 JSON 物件 (不要有任何 Markdown 標記)：
    {
        "lat": 26.2123 或 null,
        "lng": 127.6792 或 null,
        "found": true 或 false
    }
    `;

    // Try each model in order
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const model = GEMINI_MODELS[i];

        try {
            console.log(`   🤖 Trying model: ${model}${i > 0 ? ' (fallback)' : ''}`);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                const isRateLimit = RATE_LIMIT_PATTERNS.some(pattern =>
                    errorText.toLowerCase().includes(pattern.toLowerCase())
                );

                if (isRateLimit && i < GEMINI_MODELS.length - 1) {
                    console.log(`   ⚠️ ${model} rate limited, switching to next model...`);
                    continue; // Try next model
                }

                console.error(`   API Error for ${placeName}: ${response.status}`);
                return null;
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                if (i < GEMINI_MODELS.length - 1) continue;
                return null;
            }

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                if (i < GEMINI_MODELS.length - 1) continue;
                return null;
            }

            console.log(`   ✅ Success with model: ${model}`);
            return JSON.parse(jsonMatch[0]);

        } catch (error) {
            console.error(`   Error with ${model}:`, error.message);
            if (i < GEMINI_MODELS.length - 1) continue;
            return null;
        }
    }

    return null;
}

async function main() {
    const apiKey = process.argv[2];

    if (!apiKey) {
        console.log('Usage: node scripts/update-coordinates.js YOUR_GEMINI_API_KEY');
        console.log('\nTo get your Gemini API key:');
        console.log('1. Go to https://aistudio.google.com/app/apikey');
        console.log('2. Create a new API key');
        console.log('3. Run this script with the key');
        process.exit(1);
    }

    console.log('🔍 Fetching locations without coordinates...\n');

    // Fetch locations without coordinates
    const response = await fetch(`${SUPABASE_URL}/rest/v1/locations?or=(lat.is.null,lng.is.null)&select=id,name,address`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!response.ok) {
        console.error('Failed to fetch locations:', await response.text());
        process.exit(1);
    }

    const locations = await response.json();

    if (locations.length === 0) {
        console.log('✅ All locations already have coordinates!');
        process.exit(0);
    }

    console.log(`Found ${locations.length} locations without coordinates:\n`);
    locations.forEach((loc, i) => console.log(`  ${i + 1}. ${loc.name}`));
    console.log('\n');

    // Process each location
    let updated = 0;
    let failed = 0;

    for (const loc of locations) {
        console.log(`📍 Processing: ${loc.name}...`);

        const result = await fetchPlaceDetails(loc.name, apiKey);

        if (result && result.found && result.lat && result.lng) {
            // Update the location in database
            const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/locations?id=eq.${loc.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    lat: result.lat,
                    lng: result.lng
                })
            });

            if (updateResponse.ok) {
                console.log(`   ✅ Updated: ${result.lat}, ${result.lng}`);
                updated++;
            } else {
                console.log(`   ❌ Failed to update database`);
                failed++;
            }
        } else {
            console.log(`   ⚠️ Could not find coordinates`);
            failed++;
        }

        // Rate limit: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n========================================');
    console.log(`✅ Updated: ${updated} locations`);
    console.log(`❌ Failed: ${failed} locations`);
    console.log('========================================\n');
}

main().catch(console.error);
