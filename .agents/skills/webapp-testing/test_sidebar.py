#!/usr/bin/env python
"""Test sidebar collapse functionality"""

from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to dashboard
    page.goto('http://localhost:3000/dashboard')
    page.wait_for_load_state('networkidle')

    # Wait a bit for animations
    time.sleep(1)

    # Take screenshot of expanded sidebar
    page.screenshot(path='/tmp/sidebar_expanded.png', full_page=True)
    print("✓ Screenshot of expanded sidebar saved")

    # Find and click the collapse button
    toggle_button = page.locator('button[aria-label*="Recolher sidebar"]')

    if toggle_button.count() > 0:
        print("✓ Toggle button found")
        toggle_button.click()
        time.sleep(0.5)  # Wait for animation

        # Take screenshot of collapsed sidebar
        page.screenshot(path='/tmp/sidebar_collapsed.png', full_page=True)
        print("✓ Screenshot of collapsed sidebar saved")

        # Check if localStorage was updated
        collapsed = page.evaluate("() => localStorage.getItem('sidebar-collapsed')")
        print(f"✓ localStorage sidebar-collapsed: {collapsed}")

        # Click again to expand
        expand_button = page.locator('button[aria-label*="Expandir sidebar"]')
        if expand_button.count() > 0:
            expand_button.click()
            time.sleep(0.5)
            page.screenshot(path='/tmp/sidebar_expanded_again.png', full_page=True)
            print("✓ Sidebar expanded again")
    else:
        print("✗ Toggle button NOT found")

    browser.close()
    print("\n✓ Test completed!")
