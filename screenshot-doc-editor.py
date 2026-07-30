from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://localhost:5175/?view=contentTemplates')
    page.wait_for_timeout(2500)
    page.locator('.ctm-template-card').first.click()
    page.wait_for_timeout(500)
    page.locator('[data-action="use-preview"]').click()
    page.wait_for_timeout(1500)
    page.screenshot(path='e:/dmtplat-test/doc-editor-screenshot.png', full_page=False)
    print('saved doc-editor-screenshot.png')
    b.close()
