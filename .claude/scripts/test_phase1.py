#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
import os

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to app
    page.goto('http://localhost:3004', wait_until='networkidle')
    page.wait_for_timeout(2000)  # Wait for theme to apply

    # Screenshot light mode
    output_dir = '/tmp/phase1_screenshots'
    os.makedirs(output_dir, exist_ok=True)
    page.screenshot(path=f'{output_dir}/01_light_mode.png', full_page=True)
    print(f"✓ Light mode screenshot saved: {output_dir}/01_light_mode.png")

    # Look for theme toggle button (usually in header)
    theme_toggle = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="mode" i]')
    toggle_count = theme_toggle.count()

    if toggle_count > 0:
        print(f"Found {toggle_count} theme toggle buttons")
        theme_toggle.first.click()
        page.wait_for_timeout(1000)  # Wait for dark mode to apply

        # Screenshot dark mode
        page.screenshot(path=f'{output_dir}/02_dark_mode.png', full_page=True)
        print(f"✓ Dark mode screenshot saved: {output_dir}/02_dark_mode.png")
    else:
        print("⚠ No theme toggle found, checking for dark class on html")
        # Try to enable dark mode via document API
        page.evaluate('() => document.documentElement.classList.add("dark")')
        page.wait_for_timeout(1000)
        page.screenshot(path=f'{output_dir}/02_dark_mode_via_class.png', full_page=True)
        print(f"✓ Dark mode (via class) screenshot saved: {output_dir}/02_dark_mode_via_class.png")

    # Check computed colors on primary elements
    primary_color = page.evaluate('''
        () => {
            const el = document.querySelector('button, [role="button"]');
            if (el) {
                return {
                    background: getComputedStyle(el).backgroundColor,
                    color: getComputedStyle(el).color,
                    textContent: el.textContent?.slice(0, 20)
                };
            }
            return null;
        }
    ''')

    if primary_color:
        print(f"\n✓ Primary button computed style: {primary_color}")

    browser.close()
    print(f"\n✓ All screenshots saved to: {output_dir}")
