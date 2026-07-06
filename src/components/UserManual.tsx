import React, { useState } from 'react';
import { BookOpen, X, Play, Database, Cloud, Shield, Bot, LayoutList } from 'lucide-react';

interface UserManualProps {
  onClose: () => void;
  lang?: 'he' | 'en';
}

export function UserManual({ onClose, lang = 'he' }: UserManualProps) {
  const [activeChapter, setActiveChapter] = useState('intro');

  const chapters = [
    { id: 'intro', title: lang === 'he' ? '1. מבוא ל-BotForge' : '1. Intro to BotForge', icon: <BookOpen className="w-5 h-5 mx-2" /> },
    { id: 'buttons', title: lang === 'he' ? '2. מילון כפתורים מפורט' : '2. Button Glossary', icon: <LayoutList className="w-5 h-5 mx-2" /> },
    { id: 'auth', title: lang === 'he' ? '3. חיבור והזדהות (Google)' : '3. Authentication (Google)', icon: <Cloud className="w-5 h-5 mx-2" /> },
    { id: 'chat', title: lang === 'he' ? '4. סיוע AI' : '4. AI Assistant Chat', icon: <Bot className="w-5 h-5 mx-2" /> },
    { id: 'bots', title: lang === 'he' ? '5. ניהול והפעלת בוטים' : '5. Bots Management', icon: <Play className="w-5 h-5 mx-2" /> },
    { id: 'integrations', title: lang === 'he' ? '6. סנכרון ושילובי Workspace' : '6. Workspace Integrations', icon: <Database className="w-5 h-5 mx-2" /> },
    { id: 'advanced', title: lang === 'he' ? '7. הגדרות ו-Shield' : '7. Settings & Shield', icon: <Shield className="w-5 h-5 mx-2" /> },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 animate-fadeIn backdrop-blur-sm shadow-2xl" id="user-manual-modal">
      <div className="w-full max-w-5xl bg-[#0a0e17] rounded-3xl border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col md:flex-row overflow-hidden max-h-[90vh]" style={{ direction: lang === 'he' ? 'rtl' : 'ltr' }}>
        
        {/* Sidebar */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-l border-slate-800 bg-slate-900/40 p-4 md:p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-white px-2 tracking-wide font-sans shadow-black drop-shadow-md">
              {lang === 'he' ? 'ספר משתמש' : 'User Manual'}
            </h2>
            <button 
              onClick={onClose}
              className="md:hidden text-slate-400 hover:text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="space-y-2">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => setActiveChapter(chapter.id)}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeChapter === chapter.id
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                {chapter.icon}
                <span className="flex-1 text-right">{chapter.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="w-full md:w-2/3 p-6 md:p-10 overflow-y-auto bg-slate-950/20 relative">
          <button 
            onClick={onClose}
            className="hidden md:block absolute top-6 left-6 text-slate-500 hover:text-white cursor-pointer bg-slate-900 border border-slate-800 rounded-lg p-2"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="prose prose-invert max-w-none text-slate-300">
            {activeChapter === 'intro' && (
              <div className="animate-fadeIn space-y-6">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">{lang === 'he' ? 'מבוא ל-BotForge' : 'Intro to BotForge'}</h3>
                <p className="leading-relaxed">
                  {lang === 'he' 
                    ? 'ברוכים הבאים ל-BotForge. אפליקציה זו מאפשרת לך לבנות, לנהל ולהריץ בוטים מותאמים אישית (אוטומציות) על סמך פקודות בשפה טבעית או על ידי גרירת אבני בניין. המערכת משלבת עוזר בינה מלאכותית (AI) שעוזר לך לבנות סקריפטים מסובכים.' 
                    : 'Welcome to BotForge. This application allows you to creatively build, run and manage automated web-robots. Built-in AI translates your natural language requests to automated scripts.'}
                </p>
                <div className="bg-slate-900 p-4 border border-slate-800 justify-center rounded-xl flex items-center gap-4">
                  <Bot className="w-12 h-12 text-blue-500" />
                  <p className="text-sm">
                    {lang === 'he'
                      ? 'האפליקציה מתחלקת למספר אזורים מרכזיים: הגדרות (למעלה), רשימת בוטים, סיוע טכני בצ\'אט, ולוח דשבורד של סנכרון ל-Google Workspace.'
                      : 'The app is split into main workspaces: Top bar config, My Bots list, The AI sandbox, and Workspace dashboard.'}
                  </p>
                </div>
              </div>
            )}

            {activeChapter === 'buttons' && (
              <div className="animate-fadeIn space-y-6">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">{lang === 'he' ? 'מילון כפתורים המלא (על מה כל כפתור אחראי)' : 'Complete Button Glossary'}</h3>
                <p className="leading-relaxed mb-6 text-sm text-slate-400">
                  {lang === 'he' 
                    ? 'הכנו עבורך מדריך מפורט של כל הכפתורים במסך הראשי כדי שתדע בדיוק על מה אתה לוחץ:'
                    : 'Here is a detailed mapping of every button available in the application:'}
                </p>
                
                {/* Header Buttons */}
                <h4 className="text-emerald-400 font-bold border-b border-emerald-900/50 pb-2 mb-3 mt-6">{lang === 'he' ? 'סרגל עליון (Header)' : 'Top Navigation'}</h4>
                <div className="space-y-4 text-sm text-slate-350">
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">התחבר לחשבון (Google/אורח)</span>
                     פותח חלונית התחברות קלה דרך Google (כדי לאפשר שמירה בטוחה של המידע שלך בענן). ישנה אופציית "חיבור אורח" אם אינך מעוניין שהנתונים ישמרו בסגירת האפליקציה.
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">התנתק (Sign Out)</span>
                     מנתק את חשבון המשתמש המחובר באופן מאובטח ומוחק שאריות מקומיות.
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">ספר הוראות (📖)</span>
                     פותח את מדריך זה. מאפשר לך לנווט ולהבין את כל המערכות באפליקציה.
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">שפה (🌐)</span>
                     מחליף את ממשק האפליקציה לעברית (RTL) או אנגלית (LTR) בצורה יציבה.
                  </div>
                </div>

                {/* AI Assistant Chat Bots */}
                <h4 className="text-blue-400 font-bold border-b border-blue-900/50 pb-2 mb-3 mt-6">{lang === 'he' ? 'צ\'אט סיוע ועוזר בינה מלאכותית' : 'AI Assistant Area'}</h4>
                <div className="space-y-4 text-sm text-slate-350">
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">חץ למעלה (⬆️ - כפתור "שלח")</span>
                     משגר את הפקודה הטקסטואלית שכתבת לעוזר הראשי שמייצר מיד תגובה או בוט מוכן. מחייב שהזנת טקסט כלשהו בשורה למטה.
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">אייקון של מצלמה (📷 - העלאת מסמך/תמונה)</span>
                     פותח חלונית לבחירת קובץ מהמחשב שלך. אתה יכול להעלות צילום מסך של אתר כדי ליידע את העוזר על המבנה של האתר (כפתורים, טפסים) לצורך כתיבת אוטומציה מדויקת יותר.
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">כפתור "מצב מפתח" מכובה/דולק</span>
                     מתג (Toggle) שמפעיל את "מצב מהנדס התוכנה" של העוזר. כשהוא מופעל, העוזר ייטה לכתוב קוד גולמי של Typescript לבוטים מסובכים ופחות ינסה לייצר תבניות גרפיות פשוטות.
                  </div>
                </div>

                {/* Bot Actions */}
                <h4 className="text-orange-400 font-bold border-b border-orange-900/50 pb-2 mb-3 mt-6">{lang === 'he' ? 'ניהול בוטים (צד ימין/דשבורד)' : 'Bot Controls'}</h4>
                <div className="space-y-4 text-sm text-slate-350">
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">+ בוט חדש</span>
                     יוצר אובייקט "בוט" לבנים וירוק מאפס (ללא קוד) ומכניס אותו אוטומטית לרשימת "הבוטים שלי".
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">הרצה בסביבת מגן (▶️ Play כחול)</span>
                     הכפתור החשוב ביותר. הוא לוקח את הבוט, מהדר (Compile) את הקוד שלו, ומריץ אותו ב"ארגז חול" (Sandbox) מאובטח בענן. פותח מיידית את "הטרמינל" (מסך שחור מתגלגל).
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">צפה בוט (📝 עפרון ירוק)</span>
                     מעביר אותך לחלון "ערוך קוד" בו תוכל לראות בדיוק אילו פקודות רצות (למשל page.goto, page.click) ולשנות אותן טקסטואלית במקלדת במקום דרך הצ'אט. 
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">שתף בוט (📤)</span>
                     מעלה את הבוט האישי שלך ל-FireStore, משייך לו מזהה (ID) פרטי, ומחולל קוד/לינק למיזוג ואוטומציה מרחוק שתוכל להעתיק ולשלוח לאנשים.
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">מחק (🗑️ פח אדום)</span>
                     מבטל ומוחק באופן סופי את הבוט המסוים מהזיכרון/ענן שלך ללא דרך שחזור קלה, השתמש בזהירות!
                  </div>
                </div>
                
                 {/* Workspace */}
                 <h4 className="text-purple-400 font-bold border-b border-purple-900/50 pb-2 mb-3 mt-6">{lang === 'he' ? 'כפתורי סביבת Google Workspace' : 'Workspace Interface'}</h4>
                <div className="space-y-4 text-sm text-slate-350">
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">התחבר לחשבון Google Workspace (כפתור רחב בצד הדשבורד)</span>
                     דורש ממך לבצע תהליך הרשאות מלא מול שרתי Google OAuth כדי לאפשר לבוטים לתקשר ישירות עם מסמכים, אקסלים או המיילים שלך. זהו חיבור עצמאי בנוסף לחיבור ההזדהות. 
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">טאבים (Drive / Sheets / Calendar / Docs / Slides / Gmail / Chat)</span>
                     שורה של כפתורי מעבר בין קוביות סנכרון שונות - לחיצה עליהם לא מתחילה שום דבר מלבד לשנות את התצוגה המרכזית (כמו כרטיסיות בדפדפן).
                  </div>
                  <div className="bg-slate-900 border border-slate-800/50 rounded-lg p-3">
                     <span className="font-bold text-white block mb-1">ייצא לדרייב / יצירת Google Sheet וכד'</span>
                     כפתורי הפעלה ישירה. אם ניתנו הרשאות ל-Workspace מראש, כפתורים אלו יוצרים באופן אקטיבי את הקובץ (או המסמך) וכותבים אליו את הנתונים העדכניים של הבוט. לאחר ההצלחה תראה קישור לחיץ אל הקובץ עצמו (שיפתח בלשונית חדשה בדפדפן).
                  </div>
                </div>

              </div>
            )}

            {activeChapter === 'auth' && (
              <div className="animate-fadeIn space-y-6">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">{lang === 'he' ? 'חיבור והזדהות (Google)' : 'Authentication'}</h3>
                <p className="leading-relaxed">
                  {lang === 'he'
                    ? 'המערכת כעת תומכת באופן מלא ב-Google Workspace. כשאתה לוחץ על "התחבר לחשבון", תוכל לבחור להתחבר בצורה מאובטחת באמצעות Google, כך שכל ההיסטוריה, הבוטים והסנכרונים ישמרו תחת חשבונך. תוכל גם להתחבר במצב "אורח" שבו הבוטים לא נשמרים לענן.'
                    : 'You can securely login using your Google Account. Your robots, chat history and tokens will be scoped and protected using Google security.'}
                </p>
              </div>
            )}

            {activeChapter === 'chat' && (
              <div className="animate-fadeIn space-y-6">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">{lang === 'he' ? 'סיוע בינה מלאכותית' : 'AI Assistant'}</h3>
                <p className="leading-relaxed">
                  {lang === 'he'
                    ? 'העוזר המובנה (Chat) הוא לב המערכת. הוא מסוגל לקרוא את קוד המקור, לנתח תמונות שאתה מעלה אליו, ולהכין בוטים חדשים פועלים! ניתן להעלות לו תמונות של אתרים פנימיים כדי שהוא יבנה פונקציות המיועדות ספציפית לזה.'
                    : 'The integrated AI Chat provides code generation features.'}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <h4 className="font-bold text-emerald-400">יצירה מהירה</h4>
                    <p className="text-xs mt-2 text-slate-400">פשוט כתוב לעוזר מה הבוט צריך לעשות, והוא ינסח עבורך את כל הקוד (Typescript/Javascript).</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <h4 className="font-bold text-blue-400">ניתוח מדיה</h4>
                    <p className="text-xs mt-2 text-slate-400">העלה צילומי מסך כדי שהעוזר יזהה לחצנים ויכניס אותם לסורס-קוד.</p>
                  </div>
                </div>
              </div>
            )}

            {activeChapter === 'bots' && (
              <div className="animate-fadeIn space-y-6">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">{lang === 'he' ? 'ניהול והפעלת בוטים' : 'Running Bots'}</h3>
                <p className="leading-relaxed">
                  {lang === 'he'
                    ? 'לכל בוט יש 3 כפתורים מרכזיים: "הרצה בסביבת מגן" להפעלת הבוט בסנדבוקס, צפווי בקוד (עריכת סקריפטים), ומחיקה.'
                    : 'Each robot has execution controls, script preview windows and settings.'}
                </p>
                <ul className="list-disc leading-loose px-6 text-sm text-slate-350">
                  <li><strong>קוד בוט (Code):</strong> העוזר מייצר סקריפט אוטומציה שתוכל גם לערוך ידנית דרך המערכת העריכה.</li>
                  <li><strong>הגדרות תזמון (Speed):</strong> ניתן לקבוע האם הבוט רץ לאט (אמולציה אנושית) או מהר.</li>
                  <li><strong>Logs (לוגים):</strong> בעת ההפעלה, יפתח חלונית טרמינל המראה שגיאות ותוצאות בזמן אמת.</li>
                </ul>
              </div>
            )}

            {activeChapter === 'integrations' && (
              <div className="animate-fadeIn space-y-6">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">{lang === 'he' ? 'סנכרון ו-Google Workspace' : 'Workspace Sync'}</h3>
                <p className="leading-relaxed">
                  {lang === 'he'
                    ? 'השילוב המתקדם ביותר. מאפשר לבוט לשמור דוחות ותוצרים ישירות לחשבונו המאובטח של המשתמש!'
                    : 'Push bot reporting and outputs directly to your private ecosystem.'}
                </p>
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                    <Database className="w-5 h-5 text-emerald-500" /> <span className="text-sm">Google Sheets: כתיבת טבלאות נתונים שנאספו (Scraped).</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                    <Cloud className="w-5 h-5 text-blue-500" /> <span className="text-sm">Google Drive/Docs: יצירת דוחות סיכום בניית סקריפטים וגיבוי של הטקסט.</span>
                  </div>
                </div>
              </div>
            )}

            {activeChapter === 'advanced' && (
              <div className="animate-fadeIn space-y-6">
                <h3 className="text-2xl font-bold text-cyan-400 mb-4">{lang === 'he' ? 'הגדרות ו-Shield' : 'Advanced & Shield'}</h3>
                <p className=" leading-relaxed">
                  {lang === 'he'
                    ? 'מערכת ה-Shield מגנה על הבוט שלך באמצעות פיתרון Captcha אוטומטי. בהגדרות תוכל לקנפג את מגבלת הקרדיטים (תקף רק ל-Admins) ולהגדיר טוקנים ומפתחות API.'
                    : 'System capabilities, credit configs, proxy rotations and stealth modes.'}
                </p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

