from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:5173'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.on('console', lambda msg: print('[console]', msg.text))
    page.goto(f'{BASE_URL}?view=workAssistant')
    page.wait_for_timeout(1000)
    page.locator('#wa-template-creator-btn').click()
    page.wait_for_timeout(500)
    page.locator('.wa-creator-tab[data-tab="form"]').click()
    page.wait_for_timeout(300)
    page.locator('#creator-name').fill('测试')
    for i in range(8):
        page.locator('#wa-creator-add-field').click()
        page.wait_for_timeout(200)
        labels = page.locator('.wa-creator-field-label').all()
        labels[-1].fill(f'字段{i+1}')
        labels[-1].blur()
        page.wait_for_timeout(200)

    # collapse all
    page.evaluate('document.querySelector(".wa-creator-field-header").click()')
    page.wait_for_timeout(300)
    page.evaluate('document.querySelector(".wa-creator-field-header").click()')
    page.wait_for_timeout(300)

    # set scroll to 200
    page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop = 200')
    page.wait_for_timeout(100)
    before = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('=== before expand click scroll', before)

    # dispatch click on header[3] without Playwright scroll-into-view
    page.evaluate('''() => {
        const headers = document.querySelectorAll('.wa-creator-field-header');
        headers[3].dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, view: window}));
        headers[3].dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true, view: window}));
        headers[3].dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
    }''')
    page.wait_for_timeout(500)
    after = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('=== after expand click scroll', after)

    # check only one expanded
    expanded_count = page.evaluate('''() => document.querySelectorAll('.field-item.active').length''')
    print('=== expanded fields count', expanded_count)

    # click another header
    page.evaluate('''() => {
        const headers = document.querySelectorAll('.wa-creator-field-header');
        headers[5].dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, view: window}));
        headers[5].dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true, view: window}));
        headers[5].dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
    }''')
    page.wait_for_timeout(500)
    after2 = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    expanded_count2 = page.evaluate('''() => document.querySelectorAll('.field-item.active').length''')
    print('=== after second expand click scroll', after2)
    print('=== expanded fields count after second click', expanded_count2)

    # test add field scroll preservation
    page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop = 300')
    page.wait_for_timeout(100)
    before_add = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('=== before add field scroll', before_add)
    page.evaluate('document.getElementById("wa-creator-add-field").click()')
    page.wait_for_timeout(500)
    after_add = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('=== after add field scroll', after_add)

    browser.close()
