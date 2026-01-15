
export const TRIP_DETAILS = {
  title: "沖繩 2026",
  dates: {
    start: "2026-02-04",
    end: "2026-02-10",
  },
  budget: {
    totalEstimated: 182986,
    currency: "TWD",
  },
};

export const DEFAULT_JPY_RATE = 0.211; // 1 JPY = 0.211 TWD (approx)

export const MEMBERS = {
  // Ting Family
  ting: { id: "ting", name: "婷", familyId: "ting_family" },
  ren: { id: "ren", name: "仁", familyId: "ting_family" },
  cheng: { id: "cheng", name: "澄", familyId: "ting_family" },
  che: { id: "che", name: "澈", familyId: "ting_family" },

  // Lin Family
  lin: { id: "lin", name: "琳", familyId: "lin_family" },
  cheng_lin: { id: "cheng_lin", name: "承", familyId: "lin_family" },
  qian: { id: "qian", name: "謙", familyId: "lin_family" },
  tong: { id: "tong", name: "瞳", familyId: "lin_family" },

  // Lei Family
  lei: { id: "lei", name: "蕾", familyId: "lei_family" },
  qing: { id: "qing", name: "慶", familyId: "lei_family" },
  rui: { id: "rui", name: "睿", familyId: "lei_family" },
  you: { id: "you", name: "宥", familyId: "lei_family" },

  // Individuals
  peng: { id: "peng", name: "朋", familyId: "individuals" },
  mei: { id: "mei", name: "美", familyId: "individuals" },
  hui: { id: "hui", name: "慧", familyId: "individuals" },
  yan: { id: "yan", name: "燕", familyId: "individuals" },
};

export const FAMILIES = [
  {
    id: "ting_family",
    name: "婷家",
    members: ["ting", "ren", "cheng", "che"],
    color: "#FF8C69", // Coral
  },
  {
    id: "lin_family",
    name: "琳家",
    members: ["lin", "cheng_lin", "qian", "tong"],
    color: "#2E8B99", // Teal
  },
  {
    id: "lei_family",
    name: "蕾家",
    members: ["lei", "qing", "rui", "you"],
    color: "#E6B422", // Gold
  },
  {
    id: "individuals",
    name: "個人",
    members: ["peng", "mei", "hui", "yan"],
    color: "#888888", // Grey
  },
];

// Special Groups for the Analysis Dashboard
export const ANALYSIS_GROUPS = [
  { id: 'g_ting', name: '婷家', members: ['ting', 'ren', 'cheng', 'che'], color: '#FF8C69' },
  { id: 'g_lin', name: '琳家', members: ['lin', 'cheng_lin', 'qian', 'tong'], color: '#2E8B99' },
  { id: 'g_lei', name: '蕾家', members: ['lei', 'qing', 'rui', 'you'], color: '#E6B422' },
  { id: 'g_mei', name: '美', members: ['mei'], color: '#888' },
  { id: 'g_hui', name: '慧', members: ['hui'], color: '#888' },
  { id: 'g_yan', name: '燕', members: ['yan'], color: '#888' },
  { id: 'g_peng', name: '朋', members: ['peng'], color: '#888' },
];

export const ACCOMMODATION = [
  {
    id: "h1",
    name: "LACER OKINAWA NAHA Miebashi",
    img_url: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/642477862.jpg?k=131ca583635cd31f95766767a778dd69511845b34c97654597e5cda151dc4bca&o=",
    dates: "2026-02-04 - 2026-02-06",
    location: "那霸",
    address: "〒900-0016 沖縄県那覇市前島3-7-7",
    mapUrl: "https://maps.google.com/?q=LACER+OKINAWA+NAHA",
    note: "自助入住 (密碼1-3天前發送)。無停車場。",
    rooms: [
      { name: "C房 (4床)", assign: ["蕾", "慶", "睿", "宥"] },
      { name: "B房 (2大床)", assign: ["琳", "承", "謙", "瞳", "慧"] },
      { name: "A房 (2大床+上鋪)", assign: ["婷+澈", "美", "仁+澄", "燕+朋"] }
    ]
  },
  {
    id: "h2",
    name: "Riverside Chibana (河畔知花)",
    img_url: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/750613782.jpg?k=51f6b688dc7e462b9b4dad73653ebd5ce8450da2233a4480d94ae8786babf1a8&o=",
    dates: "2026-02-06 - 2026-02-08",
    location: "沖繩市",
    address: "沖縄県沖縄市知花3-19-20",
    mapUrl: "https://maps.google.com/?q=Riverside+Chibana",
    note: "16:00後入住，自助平板Check-in。",
    rooms: [
      { name: "公寓A - 房1", assign: ["婷", "澄", "澈", "美"] },
      { name: "公寓A - 房2", assign: ["仁", "燕", "朋"] },
      { name: "公寓B - 房1", assign: ["琳家", "慧"] },
      { name: "公寓B - 房2", assign: ["蕾家"] }
    ]
  },
  {
    id: "h3",
    name: "Residential Hotel Naha (那霸住宅飯店)",
    img_url: "https://r-xx.bstatic.com/xdata/images/hotel/300x225/485319429.jpg?k=100d0d0778e2d5a67b08a4e54e78dce367359525a57a35eb60e138ab12e396c1&o=",
    dates: "2026-02-08 - 2026-02-10",
    location: "那霸",
    address: "2-24-15 Kumoji, Naha",
    mapUrl: "https://maps.google.com/?q=Residential+Hotel+Naha",
    note: "美榮橋站3分鐘。無電梯。",
    rooms: [
      { name: "公寓A - 塌塌米", assign: ["婷家", "朋"] },
      { name: "公寓A - 房1", assign: ["燕"] },
      { name: "公寓A - 房2", assign: ["美"] },
      { name: "公寓B - 塌塌米", assign: ["琳", "謙", "瞳", "慧"] },
      { name: "公寓B - 房1", assign: ["蕾家"] },
      { name: "公寓B - 房2", assign: ["承"] }
    ]
  },
];

export const FLIGHTS = [/* ... existing content ... */];

export const LOCATION_DETAILS = {
  "naha_airport": {
    name: "那霸機場",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fibw.bwnet.com.tw%2Fac_gallery%2F2021%2F12%2F2501dbd9-2388-5550-c0b6-5db3c4f15872_800.webp?id=be70bcf3-718a-483d-80af-69dbf580c9cb&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "航班 IT232｜TPE 桃園國際機場 T1 → OKA 那霸機場｜起飛 18:20（台北時間）→ 抵達 20:40（日本時間）｜抵達後分別取車與搭乘接送。",
    address: ""
  },
  "lacer_hotel": {
    name: "入住 LACER OKINAWA",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fcf.bstatic.com%2Fxdata%2Fimages%2Fhotel%2Fmax1024x768%2F642477862.jpg%3Fk%3D131ca583635cd31f95766767a778dd69511845b34c97654597e5cda151dc4bca%26o%3D?id=2904462c-db33-8026-8f96-dd05b1fd9894&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "【重要：無人飯店】\n• 入住時間：15:00 起\n• 退房時間：11:00 前\n• 電話：03-6910-2907\n\n【入住流程】\n1. 入住前請完成「線上 Check-in」。\n2. 入口密碼：入住前1-3天會寄送到 Email。\n3. 現場用平板掃描 QR Code 辦理入住。\n4. 房間密碼：辦理完後顯示 (務必截圖！)。\n\n【設施與服務】\n• ❌ 無行李寄放 (入住前/退房後皆無法)。\n• ❌ 無停車場 (請用附近投幣式)。\n• ❌ 不提供每日清潔 (4晚以上可申請)。\n• ⚠️ 露臺桑拿遇惡劣天氣停用。",
    address: "〒900-0016 沖縄県那覇市前島3-7-7"
  },
  // Day 2
  "dmm_aquarium": {
    name: "DMM Kariyushi 水族館",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fd1grca2t3zpuug.cloudfront.net%2F2025%2F08%2F_TC_5808-%25E5%25B7%25B2%25E5%25A2%259E%25E5%25BC%25B7-%25E9%259B%259C%25E8%25A8%258A%25E6%25B8%259B%25E5%25B0%2591-1740x1000-1754536772.webp?id=26d267b4-90eb-48b7-81cd-d1446ab31dbf&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "網址：tc.kariyushi-aquarium.com/。備註：平日10:00–20:00、週末與旺季可能至21:00。推嬰兒車友善。館內冷氣強，備外套。",
    address: "沖縄県豊見城市豊崎3-35"
  },
  "senaga_island": {
    name: "瀨長島",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fstatic.gltjp.com%2Fglt%2Fdata%2Fdirectory%2F14000%2F13968%2F20241230_234552_275ce82e_w1920.webp?id=baf6aa9f-60ed-438a-9ba4-ea3566edaea4&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "備註：階梯多，帶嬰兒車建議走坡道或搭電梯。日落景色佳，假日停車較滿。臨海風大，注意保暖。",
    address: "沖縄県豊見城市瀬長174-6"
  },
  "ashibinaa": {
    name: "Ashibinaa Outlet",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fminako.tw%2Fwp-content%2Fuploads%2F2023%2F12%2FIMG_1250.jpg?id=d39c7058-7ed4-4a84-a654-4b906eda0181&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "備註：多數店鋪10:00–20:00。可索取免稅與折價券。有置物櫃與遊園小火車。",
    address: "沖縄県豊見城市豊崎1-188"
  },
  // Day 3
  "okinawa_zoo": {
    name: "沖繩兒童王國",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fd1grca2t3zpuug.cloudfront.net%2F2025%2F07%2FOkinawaZoo_Access2-870x500-1752817070.webp?id=29264a70-087b-4b72-a73a-422bd5111aed&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "備註：動物園＋科學館組合；科學館週二公休機率高。園區大，建議租推車或自備娃娃車。",
    address: "沖縄県沖縄市胡屋5-7-1"
  },
  "aeon_rycom": {
    name: "永旺夢樂城",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fresources.matcha-jp.com%2Fresize%2F720x2000%2F2023%2F02%2F22-135026.webp?id=bc5932f9-c11d-4b7d-82cc-de3f8214c972&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "備註：營業多至22:00。寶可夢中心位於5樓。假日車流大，建議傍晚後進場。",
    address: "中頭郡北中城村アワセ"
  },
  "riverside_chibana": {
    name: "入住 Riverside Chibana",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fcf.bstatic.com%2Fxdata%2Fimages%2Fhotel%2Fmax1024x768%2F750613782.jpg%3Fk%3D51f6b688dc7e462b9b4dad73653ebd5ce8450da2233a4480d94ae8786babf1a8%26o%3D?id=2914462c-db33-80b7-b476-c360980210c0&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "【重要：平板自助入住】\n• 入住時間：16:00–24:00 (超過午夜無客服)\n• 退房時間：10:00 前\n• 電話：050-1721-0751\n\n【入住流程】\n1. 一樓平板輸入「Check-in Code」或「預約代碼」。\n2. 代碼會於入住前一天/當天 Email 寄送。\n\n【設施與服務】\n• ❌ 無櫃檯、無行李寄放。\n• ❌ 無停車場 (請用附近投幣式)。\n• ❌ 不提供清潔 (房內有洗衣機)。",
    address: "沖縄県沖縄市知花3-19-20"
  },
  // Day 4
  "fishing_kingdom": {
    name: "海釣王國",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fboukennokuni.com%2Fwp%2Fwp-content%2Fuploads%2Fslider%2Fcache%2F0f898646e280cdb2c3784afdf1cfde52%2Fnettai1.jpg?id=0abe35e1-4a21-44ff-a50a-3ca479e169c8&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "營業時間：10:00–18:00。建議事先電話或官網預約以免額滿。留意兒童救生衣與遮陽。",
    address: "沖縄県うるま市"
  },
  "zanpa_cape": {
    name: "殘波岬燈塔",
    img_url: "https://www.notion.so/image/attachment%3A7f0d3313-0789-4658-bbdd-3d1b2af83403%3A%E6%AE%98%E6%B3%A2%E5%B3%BD.jpg?id=86bb40fa-9cc4-4f12-ae1e-896d0898c55c&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "登塔需購票，天候不佳時可能關閉。岬邊風大日曬強，注意安全與防曬。",
    address: "中頭郡読谷村宇座1861"
  },
  "american_village": {
    name: "美國村",
    img_url: "https://www.notion.so/image/https%3A%2F%2F1.bp.blogspot.com%2F-VL_d6I9RqV8%2FXltahubBmNI%2FAAAAAAADUgc%2FDds4x4ximPQfeLzBrdSPGJONDD6MGHQ9gCKgBGAsYHg%2Fs800%2F27.jpg?id=3a59bab4-32b8-4911-90d0-01c264df2108&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "傍晚看日落最佳。停車分散於各區，假日車位吃緊。",
    address: "中頭郡北谷町美浜"
  },
  // Day 5
  "orca_boat": {
    name: "Orca 水下觀光船",
    img_url: "https://image.kkday.com/v2/image/get/h_650%2Cc_fit/s1.kkday.com/product_23993/20250611073609_Kl63C/jpg",
    details: "請於開航前 20–30 分鐘報到，那覇・三重城港旅客待合所。風浪大時可能停航。建議自備暈船藥。",
    address: "那覇市西3-20 (三重城港)"
  },
  "urasoe_park": {
    name: "浦添大公園 (C區)",
    img_url: "https://www.notion.so/image/https%3A%2F%2Frocky.tw%2Fwp-content%2Fuploads%2F20180614013229_37.jpg?id=547e5a8e-99fa-4b37-aae5-ba9bc9f22888&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "園區腹地大，直導「C1 駐車場」較近兒童遊戲區。坡道多，請穿好走的鞋。",
    address: "浦添市伊祖周辺"
  },
  "kokusai_dori": {
    name: "國際通",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fcontent.skyscnr.com%2Fm%2F629f60fb81e28dc3%2Foriginal%2FGettyImages-480650961.jpg",
    details: "沖繩最熱鬧的街區，餐廳/伴手禮林立。",
    address: "那覇市牧志1丁目〜安里"
  },
  "residential_hotel": {
    name: "入住 Residential Hotel",
    img_url: "https://r-xx.bstatic.com/xdata/images/hotel/300x225/485319429.jpg?k=100d0d0778e2d5a67b08a4e54e78dce367359525a57a35eb60e138ab12e396c1&o=",
    details: "【重要：無電梯】\n• 入住時間：15:00–16:00 已獲同意\n• 退房時間：10:00 前\n• 電話：050-3177-2942\n• MapCode：33 157 818*06\n\n【入住流程】\n1. 填寫旅客資訊表 (Link in Email)。\n2. 入住前一天寄送自助入住方式。\n\n【設施與服務】\n• ⭕ 11:00 後可將行李放入房內。\n• ❌ 無停車場 (近美榮橋站，請用投幣停車)。\n• ❌ 無電梯，需搬行李。",
    address: "2-24-15 Kumoji, Naha"
  },
  // Day 6
  "naminoue_shrine": {
    name: "波上宮 & 海灘",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fd1grca2t3zpuug.cloudfront.net%2F2025%2F07%2Fnaminoueguanguru01-1000x750-1752043101.webp?id=642c01a3-8307-4f03-a1e7-9683d3931972&table=block&spaceId=99bf3987-bd5f-43ca-879b-10b7a2ef1fa7&width=520&userId=&cache=v2",
    details: "最佳拍照點在對面大橋，可拍到懸崖上的本殿與海景。可以買到可愛的日本小書包御守。",
    address: "那覇市若狭1-25-11"
  },
  "makishi_market": {
    name: "牧志公設市場",
    img_url: "https://www.notion.so/image/https%3A%2F%2Fbucket.klook.com%2Fwp-content%2Fuploads%2F2018%2F09%2FIMG_5419-1024x768.jpg",
    details: "一樓買海鮮，二樓代客料理。周邊有豬肉蛋飯糰本店（通常排隊）。",
    address: "那覇市松尾2-10-1"
  },
  // Day 7
  "checkout_airport": {
    name: "退房 & 機場",
    img_url: "",
    details: "",
    address: ""
  },
  "return_flight": {
    name: "搭機返台",
    img_url: "",
    details: "航班 IT233｜OKA 那霸機場 → TPE 桃園國際機場 T1",
    address: "那霸機場"
  }
};

export const SCHEDULE_PLAN = [
  {
    day: 1,
    date: "2026-02-04",
    title: "抵達沖繩",
    locations: [
      { id: "naha_airport", note: "IT232 18:20-20:40" },
      { id: "lacer_hotel", note: "自助入住" }
    ]
  },
  {
    day: 2,
    date: "2026-02-05",
    title: "水族館與購物",
    locations: [
      { id: "dmm_aquarium", note: "冷氣很強" },
      { id: "senaga_island", note: "看飛機/夕陽" },
      { id: "ashibinaa", note: "購物" }
    ]
  },
  {
    day: 3,
    date: "2026-02-06",
    title: "動物園與寶可夢",
    locations: [
      { id: "okinawa_zoo", note: "動物園" },
      { id: "aeon_rycom", note: "寶可夢中心(5F)" },
      { id: "riverside_chibana", note: "平板Check-in" }
    ]
  },
  {
    day: 4,
    date: "2026-02-07",
    title: "釣魚與美國村",
    locations: [
      { id: "fishing_kingdom", note: "建議預約" },
      { id: "zanpa_cape", note: "風大" },
      { id: "american_village", note: "夕陽/逛街" }
    ]
  },
  {
    day: 5,
    date: "2026-02-08",
    title: "潛水與市區",
    locations: [
      { id: "orca_boat", note: "提早20分報到" },
      { id: "urasoe_park", note: "遊樂設施" },
      { id: "kokusai_dori", note: "逛街" },
      { id: "residential_hotel", note: "無電梯" }
    ]
  },
  {
    day: 6,
    date: "2026-02-09",
    title: "神社與市場",
    locations: [
      { id: "naminoue_shrine", note: "御守" },
      { id: "makishi_market", note: "海鮮" },
      { id: "kokusai_dori", note: "補貨" }
    ]
  },
  {
    day: 7,
    date: "2026-02-10",
    title: "返程",
    locations: [
      { id: "checkout_airport", note: "" },
      { id: "return_flight", note: "IT233 09:45-10:20" }
    ]
  }
];

// Computed Itinerary to maintain compatibility
export const ITINERARY = SCHEDULE_PLAN.map(dayItem => ({
  ...dayItem,
  locations: dayItem.locations.map(loc => {
    const detail = LOCATION_DETAILS[loc.id] || {};
    return {
      ...detail,
      note: loc.note || detail.note || ''
    };
  })
}));

export const EXPENSE_CATEGORIES = [
  { id: "accommodation", name: "住宿", icon: "Hotel" },
  { id: "transport", name: "交通/租車", icon: "Car" },
  { id: "tickets", name: "票券/活動", icon: "Ticket" },
  { id: "food", name: "餐飲", icon: "Utensils" },
  { id: "shopping", name: "購物", icon: "ShoppingBag" },
  { id: "other", name: "其他", icon: "MoreHorizontal" },
];

const ALL_MEMBERS = Object.keys(MEMBERS);
const TING_FAM = FAMILIES[0].members;
const LIN_FAM = FAMILIES[1].members;
const LEI_FAM = FAMILIES[2].members;

// Data Seeding with EXACT Beneficiaries from Notion CSV
export const INITIAL_EXPENSES = [
  // 1. Accommodation - Naha Lacer (6575)
  // CSV Row 5: Payer Ting. Ben: Lei, Qing, Rui, You
  { title: "住宿-Lacer(房C-蕾家)", amount: 6575, category: "accommodation", payer_id: "ting", date: "2026-02-04", beneficiaries: LEI_FAM },

  // 2. Accommodation - Naha Lacer (13420)
  // CSV Row 7: Payer Ting. Ben: Lin, Cheng_Lin, Qian, Hui, Mei, Ting, Yan, Ren, Cheng, Peng (10 ppl)
  { title: "住宿-Lacer(房A+B部分)", amount: 13420, category: "accommodation", payer_id: "ting", date: "2026-02-04", beneficiaries: ["lin", "cheng_lin", "qian", "hui", "mei", "ting", "yan", "ren", "cheng", "peng"] },

  // 3. Accommodation - Okinawa City (34425)
  // CSV Row 8: Payer Ting. Ben: Ting, Lin, Lei, Cheng, Ren, Tong, Mei, Yan, Peng, Hui, Rui, Cheng_Lin, You, Qing, Qian, Che (16 ppl = All)
  { title: "住宿-知花(全員)", amount: 34425, category: "accommodation", payer_id: "ting", date: "2026-02-06", beneficiaries: ALL_MEMBERS },

  // 4. Accommodation - Naha Residential (27756)
  // CSV Row 9: Payer Ting. Ben: All 16
  { title: "住宿-那霸住宅(全員)", amount: 27756, category: "accommodation", payer_id: "ting", date: "2026-02-08", beneficiaries: ALL_MEMBERS },

  // 5. Flight - Ting Family (33070)
  // CSV Row 10: Payer Ting. Ben: Ting, Ren, Che, Cheng
  { title: "機票-婷家(4人)", amount: 33070, category: "transport", payer_id: "ting", date: "2025-10-14", beneficiaries: TING_FAM },

  // 6. Flight - Lin Family (32968)
  // CSV Row 11: Payer Lin. Ben: Lin, Cheng_Lin, Qian, Tong
  { title: "機票-琳家(4人)", amount: 32968, category: "transport", payer_id: "lin", date: "2025-10-14", beneficiaries: LIN_FAM },

  // 7. Flight - Mei (9193)
  // CSV Row 12: Payer Lin. Ben: Mei
  { title: "機票-美", amount: 9193, category: "transport", payer_id: "lin", date: "2025-10-14", beneficiaries: ["mei"] },

  // 8. Flight - Hui (9193)
  // CSV Row 13: Payer Lin. Ben: Hui
  { title: "機票-慧", amount: 9193, category: "transport", payer_id: "lin", date: "2025-10-14", beneficiaries: ["hui"] },

  // 9. Flight - Yan (9193)
  // CSV Row 14: Payer Ting. Ben: Yan
  { title: "機票-燕", amount: 9193, category: "transport", payer_id: "ting", date: "2025-10-14", beneficiaries: ["yan"] },

  // 10. Flight - Peng (7193)
  // CSV Row 15: Payer Ting. Ben: Peng
  { title: "機票-朋", amount: 7193, category: "transport", payer_id: "ting", date: "2025-10-14", beneficiaries: ["peng"] },
];
