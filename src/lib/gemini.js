export async function fetchPlaceDetails(placeName, apiKey) {
    if (!apiKey) return null;

    const prompt = `
    你是沖繩旅遊助手。請查詢地點「${placeName}」的資訊。
    
    請遵守以下規則：
    1. 即使名稱包含外語 (如 Pork Tamago) 或只有部分名稱，也請盡量推測最可能的沖繩知名地點 (例如：豬肉蛋飯糰)。
    2. 如果找不到該「特定分店」，請提供該「品牌」或該「地區」的一般性資訊即可，務必將 "found" 設為 true。
    3. 回傳純 JSON 物件：
    {
        "address": "請提供完整日文或英文地址 (若不確定請留空)",
        "details": "請用繁體中文介紹這個地點，包括特色美食或是什麼樣的地方 (約 50-80 字)。",
        "note": "一句話短評或推薦 (15字以內)",
        "type": "food", 
        "found": true
    }
    4. Type 預設為 food。如果是景點用 check_in，購物用 shopping，住宿用 stay。
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            console.error("Gemini API Error", response.statusText);
            return null;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) return null;

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error("Gemini Fetch Error:", error);
        return null;
    }
}
