#!/usr/bin/env python3
"""
Test dark mode on the landing page and dashboard
"""
from playwright.sync_api import sync_playwright
import sys

def test_dark_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(color_scheme='dark')
        page = context.new_page()

        # Test landing page
        print("Testing landing page in dark mode...")
        page.goto('http://localhost:3000', wait_until='networkidle')
        page.screenshot(path='/tmp/landing_dark.png', full_page=True)
        print("✓ Landing page screenshot saved: /tmp/landing_dark.png")

        # Test dashboard
        print("\nTesting dashboard in dark mode...")
        page.goto('http://localhost:3000/dashboard', wait_until='networkidle', timeout=15000)
        page.screenshot(path='/tmp/dashboard_dark.png', full_page=True)
        print("✓ Dashboard screenshot saved: /tmp/dashboard_dark.png")

        # Test support page
        print("\nTesting support page in dark mode...")
        page.goto('http://localhost:3000/suporte', wait_until='networkidle')
        page.screenshot(path='/tmp/support_dark.png', full_page=True)
        print("✓ Support page screenshot saved: /tmp/support_dark.png")

        # Test termos page
        print("\nTesting termos page in dark mode...")
        page.goto('http://localhost:3000/termos', wait_until='networkidle')
        page.screenshot(path='/tmp/termos_dark.png', full_page=True)
        print("✓ Termos page screenshot saved: /tmp/termos_dark.png")

        browser.close()
        print("\n✅ All screenshots captured successfully!")

if __name__ == '__main__':
    try:
        test_dark_mode()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
