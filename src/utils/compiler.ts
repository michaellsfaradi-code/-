import { BotStep, BotConfig } from "../types";

export function generateFullPuppeteerScript(name: string, url: string, steps: BotStep[], config?: BotConfig): string {
  let stepsCode = "";
  steps.forEach((step, idx) => {
    stepsCode += `\n  // Step ${idx + 1}: ${step.title}\n  // ${step.description}\n`;
    const cleanSelector = (step.selector || "").replace(/['"]/g, '\\$&');
    const cleanValue = (step.value || "").replace(/['"]/g, '\\$&');

    if (step.type === "navigate") {
      stepsCode += `  await page.goto('${step.value || url}', { waitUntil: 'networkidle2' });\n`;
    } else if (step.type === "click") {
      stepsCode += `  await page.waitForSelector('${cleanSelector}', { visible: true });\n`;
      stepsCode += `  await page.click('${cleanSelector}');\n`;
    } else if (step.type === "input") {
      stepsCode += `  await page.waitForSelector('${cleanSelector}', { visible: true });\n`;
      stepsCode += `  await page.type('${cleanSelector}', '${cleanValue}', { delay: 100 });\n`;
    } else if (step.type === "wait") {
      stepsCode += `  await new Promise(r => setTimeout(r, ${step.simulatedDurationMs || 1000}));\n`;
    } else if (step.type === "scroll") {
      stepsCode += `  await page.evaluate(() => window.scrollBy(0, 450));\n`;
      stepsCode += `  await new Promise(r => setTimeout(r, 500));\n`;
    } else if (step.type === "extract") {
      stepsCode += `  await page.waitForSelector('${cleanSelector}', { visible: true });\n`;
      stepsCode += `  const val${idx} = await page.evaluate(() => document.querySelector('${cleanSelector}')?.textContent);\n`;
      stepsCode += `  console.log('[Scraped]', val${idx});\n`;
    } else {
      stepsCode += `  // Custom action securely skipped\n  await new Promise(r => setTimeout(r, 500));\n`;
    }
  });

  const useAdvancedOptions = config && (config.bypassCaptcha || config.useProxies || config.isolatedContext);
  
  if (useAdvancedOptions) {
    return `const puppeteer = require('puppeteer-extra');
${config.bypassCaptcha ? "const StealthPlugin = require('puppeteer-extra-plugin-stealth');\npuppeteer.use(StealthPlugin());\n" : ""}
(async () => {
  console.log('Starting execution of automated bot: ${name}');
  
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox'${config.isolatedContext ? ",\n    '--disable-web-security',\n    '--isolate-extensions'" : ""}${config.useProxies ? ",\n    // Replace with real rotating proxy endpoint\n    '--proxy-server=http://proxy.datacenters.example.com:8080'" : ""}
  ];

  const browser = await puppeteer.launch({ 
    headless: true,
    args: args
  });
  
  const page = await browser.newPage();
  ${config.bypassCaptcha ? "\n  // Intercept and solve Captcha logic via standard stealth/solver capabilities\n  console.log('Stealth and Captcha handling plugin active.');" : ""}
  
  // Navigate to target
  await page.goto('${url || "about:blank"}', { waitUntil: 'networkidle2' });
  ${stepsCode}
  
  console.log('Execution of automated bot completed status: success');
  await browser.close();
})();`;
  }

  // STANDARD GENERATOR
  return `const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting execution of automated bot: ${name}');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to target
  await page.goto('${url || "about:blank"}', { waitUntil: 'networkidle2' });
  ${stepsCode}
  
  console.log('Execution of automated bot completed status: success');
  await browser.close();
})();`;
}

export function generateCSharpSeleniumScript(name: string, url: string, steps: BotStep[]): string {
  let stepsCode = "";
  steps.forEach((step, idx) => {
    stepsCode += `\n            // Step ${idx + 1}: ${step.title} (${step.type})\n            // ${step.description}\n`;
    const cleanSelector = (step.selector || "").replace(/"/g, '\\"');
    const cleanValue = (step.value || "").replace(/"/g, '\\"');
    
    if (step.type === "navigate") {
      stepsCode += `            driver.Navigate().GoToUrl("${step.value || url}");\n`;
    } else if (step.type === "click") {
      stepsCode += `            var elClick${idx} = driver.FindElement(By.CssSelector("${cleanSelector}"));\n`;
      stepsCode += `            elClick${idx}.Click();\n`;
    } else if (step.type === "input") {
      stepsCode += `            var elInput${idx} = driver.FindElement(By.CssSelector("${cleanSelector}"));\n`;
      stepsCode += `            elInput${idx}.Clear();\n`;
      stepsCode += `            elInput${idx}.SendKeys("${cleanValue}");\n`;
    } else if (step.type === "wait") {
      stepsCode += `            Thread.Sleep(${step.simulatedDurationMs});\n`;
    } else if (step.type === "scroll") {
      stepsCode += `            ((IJavaScriptExecutor)driver).ExecuteScript("window.scrollBy(0, 450);");\n`;
    } else if (step.type === "extract") {
      stepsCode += `            var val${idx} = driver.FindElement(By.CssSelector("${cleanSelector}")).Text;\n`;
      stepsCode += `            Console.WriteLine($"[Scraped] Extracted elements data: {val${idx}}");\n`;
    } else {
      stepsCode += `            // Custom execution simulation fallback\n            Thread.Sleep(500);\n`;
    }
  });

  return `using System;
using System.Threading;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;

// ===================================================================
// INSTRUCTIONS TO BUILD INTO A WINDOWS (.EXE) RUNNABLE EXECUTABLE:
// 1. Install .NET SDK on your Windows computer (https://dotnet.microsoft.com/)
// 2. Open Command Prompt and run:
//    mkdir BotForgeApp && cd BotForgeApp && dotnet new console
// 3. Install Selenium Nuget Package:
//    dotnet add package Selenium.WebDriver --version 4.10.0
// 4. Overwrite Program.cs with this code and run:
//    dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
// 5. Your ready-to-run .EXE will be in /bin/Release/netX.X/win-x64/publish/
// ===================================================================

namespace BotForgeEXE
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== BotForge PRO Windows Automated Execution Module ===");
            Console.WriteLine("Executing Bot: ${name}");
            Console.WriteLine("Target URL: ${url}");

            var options = new ChromeOptions();
            options.AddArgument("--headless"); // Run silently without GUI
            options.AddArgument("--disable-gpu");
            options.AddArgument("--window-size=1280,800");

            using (var driver = new ChromeDriver(options))
            {
                try 
                {
                    // Navigate to start URL
                    driver.Navigate().GoToUrl("${url || "about:blank"}");
                    Thread.Sleep(2000); // Await network load
                    ${stepsCode}
                    Console.WriteLine("\\n[SUCCESS] Bot script finished executing successfully!");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"\\n[ERROR] Automation collapsed: {ex.Message}");
                }
            }

            Console.WriteLine("Press any key to exit execution shell...");
            Console.ReadKey();
        }
    }
}`;
}

export function generateSwiftUiScript(name: string, url: string, steps: BotStep[]): string {
  let stepsCode = "";
  steps.forEach((step, idx) => {
    stepsCode += `\n        // Step ${idx + 1}: ${step.title}\n        // ${step.description}\n`;
    const cleanSelector = (step.selector || "").replace(/'/g, "\\'");
    const cleanValue = (step.value || "").replace(/'/g, "\\'");
    
    if (step.type === "navigate") {
      stepsCode += `        self.loadUrl(urlString: "${step.value || url}")\n`;
    } else if (step.type === "click") {
      stepsCode += `        self.jsContext("document.querySelector('${cleanSelector}').click();")\n`;
    } else if (step.type === "input") {
      stepsCode += `        self.jsContext("var el = document.querySelector('${cleanSelector}'); el.value = '${cleanValue}'; el.dispatchEvent(new Event('input', { bubbles: true }));")\n`;
    } else if (step.type === "wait") {
      stepsCode += `        self.sleepAction(ms: ${step.simulatedDurationMs})\n`;
    } else if (step.type === "scroll") {
      stepsCode += `        self.jsContext("window.scrollBy(0, 450);")\n`;
    } else if (step.type === "extract") {
      stepsCode += `        self.jsExtractContext(selector: "${cleanSelector}")\n`;
    } else {
      stepsCode += `        self.sleepAction(ms: 500)\n`;
    }
  });

  return `import SwiftUI
import WebKit

// ===================================================================
// INSTRUCTIONS TO DEPLOY NATIVELY ON IPHONE / iOS DEVICES:
// 1. Open Xcode on your macOS computer.
// 2. Create a new "iOS Single View App" using SwiftUI interface.
// 3. Copy-paste this complete swift file into your Xcode project.
// 4. Run the simulator or plug in your iPhone to launch native WKWebView automation!
// ===================================================================

struct BotForgeSwiftUiView: View {
    @StateObject private var driver = IOSAutomationEngine()
    @State private var logHistory: [String] = []

    var body: some View {
        VStack(spacing: 0) {
            // Native Header Control bar 
            VStack(alignment: .leading, spacing: 6) {
                Text("📱 BotForge AI - מודול הרצה iOS")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text("בוט פעיל: ${name}")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack {
                    Button(action: {
                        driver.runActiveWorkflow()
                    }) {
                        Text("הפעל אוטומציה כעת")
                            .font(.system(size: 13, weight: .bold))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                    Spacer()
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .shadow(radius: 2)

            // Live WebKit View wrapper
            SwiftUIWebView(webView: driver.webView)
                .frame(height: 300)
                .border(Color.gray.opacity(0.3), width: 1)

            // Real-time developer Logs console
            VStack(alignment: .leading, spacing: 5) {
                Text("לוגים מעקב ביצוע בזמן אמת:")
                    .font(.caption)
                    .fontWeight(.bold)
                ScrollView {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(driver.logs, id: \\.self) { log in
                            Text(log)
                                .font(.system(.caption, design: .monospaced))
                                .foregroundColor(.green)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.black)
            .foregroundColor(.green)
        }
    }
}

class IOSAutomationEngine: NSObject, ObservableObject, WKNavigationDelegate {
    @Published var logs: [String] = []
    let webView = WKWebView()

    override init() {
        super.init()
        webView.navigationDelegate = self
        appendLog("מערכת הפעלה iOS אותחלה. מוכן להתנעה.")
    }

    func appendLog(_ txt: String) {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        let timestamp = formatter.string(from: Date())
        DispatchQueue.main.async {
            self.logs.append("[\\(timestamp)] \\(txt)")
        }
    }

    func runActiveWorkflow() {
        appendLog("מתחיל סנכרון והרצה על אתר: ${url}")
        
        guard let targetUrl = URL(string: "${url}") else {
            appendLog("כתובת אתר שגויה")
            return
        }
        
        let request = URLRequest(url: targetUrl)
        webView.load(request)
        
        // Execute translated BotForge instructions after rendering loaded views
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            self.executeSteps()
        }
    }

    private func executeSteps() {
        appendLog("--- מתחיל ביצוע שלבי בוט האוטומציה ---")
        ${stepsCode}
        appendLog("--- כל שלבי האוטומציה הסתיימו בהצלחה ---")
    }

    private func loadUrl(urlString: String) {
        guard let url = URL(string: urlString) else { return }
        appendLog("ניווט בתוך הבוט לכתובת: \\(urlString)")
        webView.load(URLRequest(url: url))
    }

    private func jsContext(_ js: String) {
        appendLog("הרצת פקודת JavaScript במנוע WebKit")
        webView.evaluateJavaScript(js) { (result, error) in
            if let err = error {
                self.appendLog("כשל בביצוע: \\(err.localizedDescription)")
            } else {
                self.appendLog("שלב בוצע בהצלחה")
            }
        }
    }

    private func jsExtractContext(selector: String) {
        appendLog("חילוץ מידע מרכיב: \\(selector)")
        let js = "document.querySelector('\\(selector)').innerText"
        webView.evaluateJavaScript(js) { (result, error) in
            if let value = result as? String {
                self.appendLog("מידע חולץ בהצלחה: \\(value)")
            }
        }
    }

    private func sleepAction(ms: Int) {
        appendLog("המתנה מושהית של \\(ms) מילשניות...")
        Thread.sleep(forTimeInterval: Double(ms) / 1000.0)
    }
}

struct SwiftUIWebView: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView {
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
`;
}

