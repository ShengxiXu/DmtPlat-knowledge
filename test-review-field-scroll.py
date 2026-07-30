from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:5173'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(f'{BASE_URL}?view=workAssistant')
    page.wait_for_timeout(1000)
    page.locator('#wa-template-creator-btn').click()
    page.wait_for_timeout(500)
    page.locator('.wa-creator-tab[data-tab="form"]').click()
    page.wait_for_timeout(300)
    page.locator('#creator-name').fill('测试')
    page.locator('#wa-creator-add-field').click()
    page.wait_for_timeout(200)
    page.locator('.wa-creator-field-label').last.fill('字段A')
    page.locator('.wa-creator-field-label').last.blur()
    page.locator('#wa-creator-generate-review').click()
    page.wait_for_timeout(800)

    # scroll sidebar
    page.evaluate('document.querySelector(".wa-creator-review-sidebar").scrollTop = 50')
    page.wait_for_timeout(100)
    before = page.evaluate('document.querySelector(".wa-creator-review-sidebar").scrollTop')
    print('before review expand scroll', before)

    # expand first review field
    page.evaluate('''() => {
        const headers = document.querySelectorAll('.wa-review-field-header');
        headers[0].dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, view: window}));
        headers[0].dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true, view: window}));
        headers[0].dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
    }''')
    page.wait_for_timeout(500)
    after = page.evaluate('document.querySelector(".wa-creator-review-sidebar").scrollTop')
    expanded = page.evaluate('''() => document.querySelectorAll('.wa-review-field-item.expanded').length''')
    print('after review expand scroll', after, 'expanded count', expanded)

    # click second field
    page.evaluate('''() => {
        const headers = document.querySelectorAll('.wa-review-field-header');
        headers[1].dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, view: window}));
        headers[1].dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true, view: window}));
        headers[1].dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
    }''')
    page.wait_for_timeout(500)
    after2 = page.evaluate('document.querySelector(".wa-creator-review-sidebar").scrollTop')
    expanded2 = page.evaluate('''() => document.querySelectorAll('.wa-review-field-item.expanded').length''')
    print('after second review expand scroll', after2, 'expanded count', expanded2)

    browser.close()
