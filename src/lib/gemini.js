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
        return { error: "Invalid API Key format (must start with AIza)" };
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
            let errMsg = `API Error ${response.status}`;

            try {
                const errJson = JSON.parse(errorText);
                if (errJson.error && errJson.error.message) {
                    errMsg = errJson.error.message;
                }
            } catch (e) { }

            if (response.status === 404) {
                // Specific guidance for "Model not found" -> Project issue
                return { error: "找不到模型 (404)。您的 API Key 所在專案可能未啟用權限。\n\n💡 解決方法：\n請回到 Google AI Studio，點擊 'Create API key'，並選擇 'Create API key in new project' (建立新專案)，使用新專案的 Key 即可解決。" };
            }

            return { error: errMsg };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) return { error: "No text in response" };

        // Robust JSON Extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { error: "Response invalid (No JSON found): " + text.substring(0, 50) + "..." };
        }

        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        console.error("Gemini Fetch Error:", error);
        return { error: error.message };
    }
}
