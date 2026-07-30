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

    # add 8 fields
    for i in range(8):
        page.locator('#wa-creator-add-field').click()
        page.wait_for_timeout(200)
        labels = page.locator('.wa-creator-field-label').all()
        labels[-1].fill(f'字段{i+1}')
        labels[-1].blur()
        page.wait_for_timeout(200)

    # collapse all by clicking first header (if expanded)
    page.locator('.wa-creator-field-header').first.click()
    page.wait_for_timeout(300)

    # scroll config to middle
    page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop = 300')
    before = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('scroll before expand:', before)

    # click 5th header to expand
    headers = page.locator('.wa-creator-field-header').all()
    headers[4].click()
    page.wait_for_timeout(400)
    after = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('scroll after expand:', after)

    # count expanded editors
    expanded = page.locator('.field-item.active').count()
    print('expanded count:', expanded)

    # click 6th header to expand another
    headers[5].click()
    page.wait_for_timeout(400)
    expanded2 = page.locator('.field-item.active').count()
    print('expanded count after second click:', expanded2)
    after2 = page.evaluate('document.querySelector(".wa-creator-form-config").scrollTop')
    print('scroll after second expand:', after2)

    page.screenshot(path='e:\\dmtplat-test\\test-field-scroll.png', full_page=False)
    browser.close()
