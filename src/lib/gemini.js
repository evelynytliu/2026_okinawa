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

/**
 * Core function to call Gemini API with automatic model fallback
 * @param {string} prompt - The prompt to send
 * @param {string} apiKey - The Gemini API key
 * @param {object} options - Additional options
 * @returns {Promise<{text?: string, error?: string, modelUsed?: string}>}
 */
export async function callGemini(prompt, apiKey, options = {}) {
    const { startModelIndex = 0, maxRetries = GEMINI_MODELS.length } = options;

    const cleanKey = apiKey?.trim();
    if (!cleanKey) {
        return { error: 'API Key is required' };
    }
    if (!cleanKey.startsWith('AIza')) {
        return { error: 'Invalid API Key format (must start with AIza)' };
    }

    let lastError = null;

    for (let i = startModelIndex; i < Math.min(startModelIndex + maxRetries, GEMINI_MODELS.length); i++) {
        const model = GEMINI_MODELS[i];

        try {
            console.log(`🤖 Trying model: ${model}${i > startModelIndex ? ' (fallback)' : ''}`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                let errMsg = `API Error ${response.status}`;
                let isRateLimit = false;

                try {
                    const errJson = JSON.parse(errorText);
                    if (errJson.error?.message) {
                        errMsg = errJson.error.message;
                    }
                    if (errJson.error?.status) {
                        errMsg = `${errJson.error.status}: ${errMsg}`;
                    }
                } catch (e) { }

                // Check if this is a rate limit error
                isRateLimit = RATE_LIMIT_PATTERNS.some(pattern =>
                    errorText.toLowerCase().includes(pattern.toLowerCase())
                );

                if (isRateLimit && i < GEMINI_MODELS.length - 1) {
                    console.warn(`⚠️ ${model} rate limited, switching to next model...`);
                    lastError = errMsg;
                    continue; // Try next model
                }

                // For non-rate-limit errors or last model, return error
                return { error: errMsg, modelUsed: model };
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                lastError = 'No text in response';
                if (i < GEMINI_MODELS.length - 1) continue;
                return { error: lastError, modelUsed: model };
            }

            console.log(`✅ Success with model: ${model}`);
            return { text, modelUsed: model };

        } catch (error) {
            console.error(`❌ Error with ${model}:`, error);
            lastError = error.message;

            if (i < GEMINI_MODELS.length - 1) {
                continue; // Try next model
            }
        }
    }

    return { error: lastError || 'All models failed', modelUsed: null };
}

/**
 * Get list of available models for display
 */
export function getAvailableModels() {
    return [...GEMINI_MODELS];
}

export async function fetchPlaceDetails(placeName, apiKey) {
    if (!apiKey) return null;

    const prompt = `
    你是沖繩旅遊助手。請查詢地點「${placeName}」的資訊。
    
    ⚠️ 重要規則 - 禁止幻覺：
    - 只提供你確實知道且有信心的資訊
    - 如果不確定某個欄位的正確值，請留空字串 "" 或 null
    - 絕對不要編造地址、座標、或圖片連結
    - 寧可留空也不要亂猜
    
    請遵守以下規則：
    1. 即使名稱包含外語 (如 Pork Tamago) 或只有部分名稱，也請盡量推測最可能的沖繩知名地點 (例如：豬肉蛋飯糰)。
    2. 如果找不到該「特定分店」，請提供該「品牌」或該「地區」的一般性資訊即可，務必將 "found" 設為 true。
    3. 回傳純 JSON 物件 (不要有任何 Markdown 標記或額外文字)：
    {
        "address": "完整日文或英文地址。若不確定請留空字串 ''",
        "lat": 26.2123 或 null (數值, 緯度。若不確定請填 null),
        "lng": 127.6792 或 null (數值, 經度。若不確定請填 null),
        "image_url": "該地點的真實圖片連結 (必須是真實存在的 URL，如 Wikimedia Commons)。若找不到可靠來源請留空 ''",
        "details": "請用繁體中文介紹這個地點，包括特色美食或是什麼樣的地方 (約 50-80 字)。",
        "note": "一句話短評或推薦 (15字以內)",
        "type": "food", 
        "found": true
    }
    4. Type 可選值: spot, food, stay, fun, shop, transport。預設為 food。
    5. 如果完全不認識這個地點，請將 found 設為 false。
    `;

    // Use the shared callGemini function with automatic fallback
    const result = await callGemini(prompt, apiKey);

    if (result.error) {
        return { error: result.error };
    }

    const text = result.text;

    try {
        // Robust JSON Extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { error: "Response invalid (No JSON found): " + text.substring(0, 50) + "..." };
        }

        const parsed = JSON.parse(jsonMatch[0]);
        // Add modelUsed info for debugging
        parsed._modelUsed = result.modelUsed;
        return parsed;
    } catch (error) {
        console.error("JSON Parse Error:", error);
        return { error: "Failed to parse response: " + error.message };
    }
}
