import { BotStep, ScrapedRecord } from "./types";

export interface BotTemplate {
  name: string;
  description: string;
  goal: string;
  url: string;
  steps: BotStep[];
  mockData: ScrapedRecord[];
}

export const BOT_TEMPLATES: BotTemplate[] = [
  {
    name: "איתור משרות בלינקדאין",
    description: "סרוק משרות פיתוח תוכנה במיקומים מרוחקים (Remote) בלינקדאין, לחילוץ כותרת התפקיד, שם החברה, מיקום וקישור להגשת מועמדות.",
    goal: "חפש משרות של 'React Developer' מרחוק, אסוף נתוני משרה, שמות חברות ותאריך פרסום.",
    url: "https://www.linkedin.com/jobs",
    steps: [
      {
        id: "step_1",
        type: "navigate",
        title: "ניווט לפורטל המשרות",
        description: "טעינה ישירה של עמוד המשרות הציבורי בלינקדאין ובדיקה שתיבות החיפוש אינטראקטיביות.",
        selector: "input.jobs-search-box__text-input",
        codeSnippet: `// Load public job section
await page.goto('https://www.linkedin.com/jobs', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[aria-label="Search jobs"]', { timeout: 8000 });`,
        simulatedDurationMs: 1400
      },
      {
        id: "step_2",
        type: "input",
        title: "הזנת תפקיד ומיקום",
        description: "מילוי שדה התפקיד ב-'React Developer' ושירטוט מיקום העבודה כ-'Remote, US'.",
        value: "React Developer",
        codeSnippet: `// Type job attributes
await page.focus('input[aria-label="Search jobs"]');
await page.keyboard.type('React Developer');

await page.focus('input[aria-label="Search location"]');
// Clear initial text and type
await page.keyboard.down('Control');
await page.keyboard.press('A');
await page.keyboard.up('Control');
await page.keyboard.press('Backspace');
await page.keyboard.type('Remote, US');`,
        simulatedDurationMs: 1900
      },
      {
        id: "step_3",
        type: "click",
        title: "הפעלת החיפוש",
        description: "לחיצה על כפתור השליחה הראשי של לינקדאין כדי להריץ את השאילתה.",
        selector: "button.jobs-search-box__submit-button",
        codeSnippet: `// Confirm submission and await refresh
await Promise.all([
  page.click('button.jobs-search-box__submit-button'),
  page.waitForNavigation({ waitUntil: 'networkidle2' })
]);`,
        simulatedDurationMs: 1200
      },
      {
        id: "step_4",
        type: "wait",
        title: "המתנה לרשימת המשרות",
        description: "המתנה עד שטבלת תוצאות החיפוש ופאנל הגלילה יופיעו וירונדרו בהצלחה.",
        selector: "ul.jobs-search__results-list",
        codeSnippet: `// Wait for results container selector
await page.waitForSelector('ul.jobs-search__results-list', { timeout: 12000 });
console.log('Results loaded. Beginning data iteration...');`,
        simulatedDurationMs: 800
      },
      {
        id: "step_5",
        type: "extract",
        title: "חילוץ רשימת המשרות",
        description: "ניתוח התוצאות המובילות והחזרת קובץ נתונים מובנה הכולל תפקידים, מעסיקים, מיקום וזמן פרסום האוטומציה.",
        selector: ".base-search-card",
        codeSnippet: `// Retrieve DOM items details
const jobs = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.base-search-card')).slice(0, 4);
  return cards.map((el, i) => ({
    id: i + 1,
    role: el.querySelector('.base-search-card__title')?.textContent?.trim() || 'Developer',
    company: el.querySelector('.base-search-card__subtitle')?.textContent?.trim() || 'Confidential',
    location: el.querySelector('.job-search-card__location')?.textContent?.trim() || 'Remote',
    posted: el.querySelector('time')?.getAttribute('datetime') || 'Just now'
  }));
});`,
        simulatedDurationMs: 2500
      }
    ],
    mockData: [
      { id: 1, role: "מפתח פרונטנד בכיר (React/TypeScript)", company: "Vercel Inc.", location: "מרוחק, קליפורניה", posted: "לפני יום אחד" },
      { id: 2, role: "ארכיטקט React - פלטפורמת Next.js", company: "Linear App", location: "מרוחק, ניו יורק", posted: "לפני 3 שעות" },
      { id: 3, role: "מפתח UI מוביל (מערכות עיצוב)", company: "Stripe", location: "מרוחק, ארה\"ב", posted: "לפני יומיים" },
      { id: 4, role: "מהנדס תוכנה מנוסה - React / Redux", company: "Figma", location: "מרוחק, וושינגטון", posted: "ממש עכשיו" }
    ]
  },
  {
    name: "סורק מסעדות ב-Yelp",
    description: "עבור על מסעדות ובתי קפה ב-Yelp.com, רכז פרטי קשר, דירוגים, ביקורות ומספרי טלפון.",
    goal: "חפש 'מסעדות איטלקיות' ב-'Miami, FL', וחלץ שמות, מספרי טלפון, דירוגי כוכבים וכמות ביקורות.",
    url: "https://www.yelp.com",
    steps: [
      {
        id: "step_1",
        type: "navigate",
        title: "טעינת דף הבית של Yelp",
        description: "פתיחת אתר yelp.com ווידוא ששדות החיפוש והמיקום פתוחים ומוכנים לפעולה.",
        selector: "input#find_desc",
        codeSnippet: `// Load Yelp base
await page.goto('https://www.yelp.com', { waitUntil: 'networkidle2' });
await page.waitForSelector('input#find_desc', { timeout: 10000 });`,
        simulatedDurationMs: 1000
      },
      {
        id: "step_2",
        type: "input",
        title: "הזנת יעדי חיפוש",
        description: "הקלדת 'Yelp Italian Restaurants' בתיבת תיאור האוכל, ו-'Miami, FL' בתיבת המיקום.",
        value: "Italian Restaurants",
        codeSnippet: `// Key in search inputs
await page.click('input#find_desc', { clickCount: 3 });
await page.keyboard.type('Italian Restaurants');

await page.click('input#droplist-location_input', { clickCount: 3 });
await page.keyboard.type('Miami, FL');`,
        simulatedDurationMs: 1600
      },
      {
        id: "step_3",
        type: "click",
        title: "ביצוע השאילתה",
        description: "לחיצה על כפתור החיפוש הראשי כדי להציג את רשימת התוצאות.",
        selector: "button#header-search-submit",
        codeSnippet: `// Submit Yelp query
await Promise.all([
  page.click('button#header-search-submit'),
  page.waitForNavigation({ waitUntil: 'networkidle2' })
]);`,
        simulatedDurationMs: 1300
      },
      {
        id: "step_4",
        type: "extract",
        title: "איסוף נתוני מסעדות",
        description: "סריקת אלמנטים בקוד העמוד על מנת לחלץ שמות עסקים, מספרי טלפון, דירוגים ומספר ביקורות.",
        selector: ".businessName__09f24__6wKMn",
        codeSnippet: `// Map list nodes to structured objects
const diningList = await page.evaluate(() => {
  const elements = Array.from(document.querySelectorAll('[data-testimonial-id]')).slice(0, 4);
  return elements.map((item, index) => {
    return {
      index: index + 1,
      name: item.querySelector('.businessName__09f24__6wKMn a')?.textContent || 'Trattoria',
      ratingStars: item.querySelector('.css-f9g260')?.getAttribute('aria-label') || '4.5 Stars',
      phone: item.querySelector('.css-1p9ib9e')?.textContent || 'N/A',
      reviewsCount: item.querySelector('.css-oi608d')?.textContent || '0 reviews'
    }
  });
});`,
        simulatedDurationMs: 2300
      }
    ],
    mockData: [
      { index: 1, name: "מסעדת Sapore di Mare - מיאמי", ratingStars: "4.8 מתוך 5 כוכבים", phone: "(305) 476-0149", reviewsCount: "1.2 אלף ביקורות" },
      { index: 2, name: "מסעדת אחוזת ורסאצ'ה - מיאמי ביץ'", ratingStars: "4.7 מתוך 5 כוכבים", phone: "(305) 576-8001", reviewsCount: "860 ביקורות" },
      { index: 3, name: "מסעדת Macchialina איטלקית אותנטית", ratingStars: "4.9 מתוך 5 כוכבים", phone: "(305) 534-2124", reviewsCount: "2.5 אלף ביקורות" },
      { index: 4, name: "ביסטרו Primitivo מיאמי ווטרפרונט", ratingStars: "4.6 מתוך 5 כוכבים", phone: "(305) 604-0010", reviewsCount: "430 ביקורות" }
    ]
  },
  {
    name: "סורק מוצרים ב-eBay",
    description: "חפש מוצרים ב-eBay, סנן לפי מחיר, וחלץ כותרות פריטים, מחירים, קישורים למכירות ופרטי משלוח.",
    goal: "חפש 'Wireless Headphones' בטווח של פחות מ-$50, וחלץ 5 מוצרים מובילים עם מחיר, משלוח וסטטוס מוצר.",
    url: "https://www.ebay.com",
    steps: [
      {
        id: "step_1",
        type: "navigate",
        title: "ניווט לאתר eBay",
        description: "פתיחת עמוד הבית של eBay והמתנה לטעינת תיבת החיפוש המרכזית.",
        selector: "input#gh-ac",
        codeSnippet: `// Navigate to eBay homepage
await page.goto('https://www.ebay.com', { waitUntil: 'networkidle2' });
await page.waitForSelector('input#gh-ac', { timeout: 10000 });`,
        simulatedDurationMs: 1100
      },
      {
        id: "step_2",
        type: "input",
        title: "הזנת מילות החיפוש",
        description: "הקלדת 'Wireless Headphones' בתיבת החיפוש הראשית של האתר.",
        selector: "input#gh-ac",
        value: "Wireless Headphones",
        codeSnippet: `// Type search keyword
await page.type('input#gh-ac', 'Wireless Headphones');`,
        simulatedDurationMs: 1400
      },
      {
        id: "step_3",
        type: "click",
        title: "ביצוע החיפוש",
        description: "לחיצה על כפתור החיפוש (Search Button) והמתנה לטעינת סביבת תוצאות החיפוש.",
        selector: "input#gh-btn",
        codeSnippet: `// Click Search and wait for response
await Promise.all([
  page.click('input#gh-btn'),
  page.waitForNavigation({ waitUntil: 'networkidle2' })
]);`,
        simulatedDurationMs: 1300
      },
      {
        id: "step_4",
        type: "wait",
        title: "המתנה להצגת התוצאות מהשרת",
        description: "וידוא שטעינת תוצאות החיפוש ורשימת כרטיסי המוצרים הסתיימה בהצלחה.",
        selector: ".srp-results",
        codeSnippet: `// Verify results list is parsed
await page.waitForSelector('.srp-results', { timeout: 12000 });`,
        simulatedDurationMs: 900
      },
      {
        id: "step_5",
        type: "extract",
        title: "חילוץ המידע המובנה",
        description: "סריקת תוצאות החיפוש הבולטות וחילוץ שם המוצר, מחיר מכירה נוכחי, תנאי משלוח ודירוג המוכר פנימה לקובץ מובנה.",
        selector: ".s-item",
        codeSnippet: `// Evaluate and extract item details
const items = await page.evaluate(() => {
  const elements = Array.from(document.querySelectorAll('.srp-results .s-item')).slice(1, 6);
  return elements.map((item, idx) => {
    return {
      rank: idx + 1,
      title: item.querySelector('.s-item__title')?.textContent?.trim() || 'Headphones',
      price: item.querySelector('.s-item__price')?.textContent?.trim() || '$0.00',
      shipping: item.querySelector('.s-item__shipping')?.textContent?.trim() || 'Free Shipping',
      condition: item.querySelector('.secondary-info')?.textContent?.trim() || 'Brand New'
    };
  });
});`,
        simulatedDurationMs: 2400
      }
    ],
    mockData: [
      { rank: 1, name: "Anker Soundcore Life Q20 אוזניות לנטרול רעשים אקטיבי", price: "$44.99", shipping: "משלוח חינם", condition: "חדש באריזה" },
      { rank: 2, name: "Sony WH-CH520 אוזניות קשת אלחוטיות Bluteooth צבע שחור", price: "$38.00", shipping: "+$9.99 משלוח", condition: "מוצר מחודש" },
      { rank: 3, name: "JBL Tune 510BT אוזניות אלחוטיות נוחות וקלות", price: "$29.95", shipping: "משלוח חינם", condition: "חדש באריזה" },
      { rank: 4, name: "TOZO T6 אוזניות ספורט אלחוטיות נגד מים בתוך האוזן", price: "$23.99", shipping: "משלוח חינם", condition: "חדש באריזה" },
      { rank: 5, name: "Skullcandy Hesh ANC אוזניות מעוצבות מסננות רעש", price: "$49.99", shipping: "+$12.50 משלוח", condition: "חדש באריזה" }
    ]
  }
];
