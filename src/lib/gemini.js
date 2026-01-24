export async function fetchPlaceDetails(placeName, apiKey) {
    if (!apiKey) return null;

    const prompt = `
    你是沖繩旅遊助手。請查詢地點「${placeName}」的資訊。
    
    請遵守以下規則：
    1. 即使名稱包含外語 (如 Pork Tamago) 或只有部分名稱，也請盡量推測最可能的沖繩知名地點 (例如：豬肉蛋飯糰)。
    2. 如果找不到該「特定分店」，請提供該「品牌」或該「地區」的一般性資訊即可，務必將 "found" 設為 true。
    3. 回傳純 JSON 物件 (不要有任何 Markdown 標記或額外文字)：
    {
        "address": "請提供完整日文或英文地址 (若不確定請留空)",
        "details": "請用繁體中文介紹這個地點，包括特色美食或是什麼樣的地方 (約 50-80 字)。",
        "note": "一句話短評或推薦 (15字以內)",
        "type": "food", 
        "found": true
    }
    4. Type 預設為 food。
    `;

    // Trim key to avoid whitespace issues
    const cleanKey = apiKey.trim();
    if (!cleanKey.startsWith('AIza')) {
        console.error("Invalid API Key format (should start with AIza)");
        return null;
    }

    try {
        // Using gemini-1.5-flash (Standard free tier model)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", response.status, errorText);

            if (response.status === 404) {
                throw new Error("模型未找到 (404)。可能是新建立的金鑰尚未生效 (請等待幾分鐘)，或該金鑰專案未啟用 Generative Language API。");
            }
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) return null;

        // Robust JSON Extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn("No JSON found in response:", text);
            return null;
        }

        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        console.error("Gemini Fetch Error:", error);
        return null;
    }
}
