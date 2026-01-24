export async function fetchPlaceDetails(placeName, apiKey) {
    if (!apiKey) return null;

    const prompt = `
    你是沖繩旅遊助手。請查詢或推測地點「${placeName}」的資訊。
    請回傳一個純 JSON 物件 (不要 Markdown code block)，格式如下：
    {
        "address": "請提供完整日文或英文地址 (若不確定請留空)",
        "details": "請用繁體中文介紹這個地點，包括特色美食或亮點 (約 50-80 字)。若是不知名地點，請根據名稱推測其類型並撰寫一般性介紹。",
        "note": "一句話短評或推薦 (15字以內)",
        "type": "food", 
        "found": true
    }
    如果這明顯不是餐廳，type 可以是 check_in (景點), shopping (購物), stay (住宿)。預設為 food。
    請確保回傳的是合法的 JSON。
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
