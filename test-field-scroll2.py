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

    for i in range(8):
        page.locator('#wa-creator-add-field').click()
        page.wait_for_timeout(200)
        labels = page.locator('.wa-creator-field-label').all()
        labels[-1].fill(f'字段{i+1}')
        labels[-1].blur()
        page.wait_for_timeout(200)

    # collapse first
    page.locator('.wa-creator-field-header').first.click()
    page.wait_for_timeout(300)

    page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop = 300')
    print('set to 300, current:', page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop'))

    headers = page.locator('.wa-creator-field-header').all()
    # expose function to log snapshot inside page
    page.expose_function('py_log', lambda *args: print('[page]', *args))
    page.evaluate('''() => {
        const origRender = window.app?.renderTemplateCreator || function(){};
    }''')
    # just click and read multiple times
    headers[4].click()
    print('immediate after click:', page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop'))
    page.wait_for_timeout(50)
    print('after 50ms:', page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop'))
    page.wait_for_timeout(100)
    print('after 150ms:', page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop'))
    page.wait_for_timeout(300)
    print('after 450ms:', page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop'))
    browser.close()
