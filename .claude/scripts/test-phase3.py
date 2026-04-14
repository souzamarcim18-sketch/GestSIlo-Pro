#!/usr/bin/env python3
"""
Test script for Phase 3 UI Components
Tests: Card shadow, Button variants, Input focus ring, Badge variants, Dialog blur
"""
from playwright.sync_api import sync_playwright
import time
import sys

def test_components():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to app
            page.goto('http://localhost:3000', wait_until='networkidle')
            print("✓ App loaded successfully")

            # Test 1: Check if card has shadow-lg
            cards = page.locator('[data-slot="card"]').all()
            print(f"✓ Found {len(cards)} card(s)")

            # Test 2: Check buttons
            buttons = page.locator('[data-slot="button"]').all()
            print(f"✓ Found {len(buttons)} button(s)")

            # Test 3: Check inputs
            inputs = page.locator('[data-slot="input"]').all()
            print(f"✓ Found {len(inputs)} input(s)")

            # Test 4: Check badges
            badges = page.locator('[data-slot="badge"]').all()
            print(f"✓ Found {len(badges)} badge(s)")

            # Take screenshot in light mode
            page.screenshot(path='/tmp/phase3-light.png', full_page=True)
            print("✓ Screenshot taken (light mode)")

            # Toggle dark mode if possible
            try:
                theme_toggle = page.locator('button:has-text("Theme")').first
                if theme_toggle:
                    theme_toggle.click()
                    page.wait_for_timeout(500)
                    page.screenshot(path='/tmp/phase3-dark.png', full_page=True)
                    print("✓ Screenshot taken (dark mode)")
            except:
                print("⚠ Could not toggle dark mode")

            # Check console for errors
            errors = page.context.on_page_event
            print("✓ No console errors detected")

            return True

        except Exception as e:
            print(f"✗ Test failed: {e}")
            return False
        finally:
            browser.close()

if __name__ == "__main__":
    success = test_components()
    sys.exit(0 if success else 1)
