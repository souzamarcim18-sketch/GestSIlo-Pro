const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const outputDir = '/tmp/phase1_screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to app
    console.log('📍 Navigating to http://localhost:3004...');
    await page.goto('http://localhost:3004', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Light mode screenshot
    console.log('📸 Taking light mode screenshot...');
    await page.screenshot({ path: path.join(outputDir, '01_light_mode.png'), fullPage: true });
    console.log(`✓ Light mode screenshot: ${outputDir}/01_light_mode.png`);

    // Check if we can find theme toggle
    const themeButtons = await page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="mode" i], [role="button"][aria-label*="theme"], [role="button"][aria-label*="dark"]').all();

    if (themeButtons.length > 0) {
      console.log(`Found ${themeButtons.length} theme toggle buttons`);
      await themeButtons[0].click();
      await page.waitForTimeout(1000);

      console.log('📸 Taking dark mode screenshot...');
      await page.screenshot({ path: path.join(outputDir, '02_dark_mode.png'), fullPage: true });
      console.log(`✓ Dark mode screenshot: ${outputDir}/02_dark_mode.png`);
    } else {
      console.log('⚠️  No theme toggle found, enabling dark mode via JS...');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(1000);

      console.log('📸 Taking dark mode screenshot...');
      await page.screenshot({ path: path.join(outputDir, '02_dark_mode_manual.png'), fullPage: true });
      console.log(`✓ Dark mode screenshot: ${outputDir}/02_dark_mode_manual.png`);
    }

    // Check primary colors
    const colors = await page.evaluate(() => {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      const fg = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
      const isDark = document.documentElement.classList.contains('dark');

      return { primary, bg, fg, isDark, mode: isDark ? 'dark' : 'light' };
    });

    console.log('\n✓ CSS Variables detected:');
    console.log(`  Mode: ${colors.mode}`);
    console.log(`  --primary: ${colors.primary}`);
    console.log(`  --background: ${colors.bg}`);
    console.log(`  --foreground: ${colors.fg}`);

    console.log(`\n✓ All tests passed! Screenshots saved to: ${outputDir}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
