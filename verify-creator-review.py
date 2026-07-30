from playwright.sync_api import sync_playwright, expect
import os
import sys

BASE_URL = 'http://localhost:5173'

def wait_network_idle(page, timeout=5000):
    try:
        page.wait_for_load_state('networkidle', timeout=timeout)
    except Exception:
        pass

def screenshot(page, name):
    path = os.path.join('e:\\dmtplat-test', f'verify-{name}.png')
    page.screenshot(path=path, full_page=True)
    print(f'[screenshot] {path}')

def test_form_creation(page):
    print('=== Testing FORM creation ===')
    page.goto(f'{BASE_URL}?view=workAssistant')
    wait_network_idle(page)
    screenshot(page, '01-home')

    # enter template creator
    page.locator('#wa-template-creator-btn').click()
    wait_network_idle(page)
    screenshot(page, '02-creator-tabs')

    # switch to form tab
    page.locator('.wa-creator-tab[data-tab="form"]').click()
    page.wait_for_timeout(300)

    # fill name
    page.locator('#creator-name').fill('客户方案生成（表单测试）')

    # add field and expand it
    page.locator('#wa-creator-add-field').click()
    page.wait_for_timeout(200)
    page.locator('.wa-creator-field-header').first.click()
    page.wait_for_timeout(200)
    page.locator('.wa-creator-field-label').first.fill('客户需求')
    page.locator('.wa-creator-field-label').first.blur()
    page.wait_for_timeout(200)

    # generate review
    page.locator('#wa-creator-generate-review').click()
    page.wait_for_timeout(500)
    wait_network_idle(page)
    screenshot(page, '03-form-review')

    # check review page
    assert page.locator('.wa-creator-review-layout').is_visible(), 'form: review layout not visible'
    assert page.locator('.wa-review-tab[data-tab="prompt"]').is_visible(), 'form: prompt tab missing'
    assert page.locator('#wa-review-save').is_visible(), 'form: save button missing'

    # switch tabs
    page.locator('.wa-review-tab[data-tab="form"]').click()
    page.wait_for_timeout(200)
    screenshot(page, '04-form-preview')
    assert page.locator('.wa-review-form-preview-card').is_visible(), 'form: form preview missing'

    page.locator('.wa-review-tab[data-tab="test"]').click()
    page.wait_for_timeout(200)
    screenshot(page, '05-form-test')
    assert page.locator('.wa-review-run-test').is_visible(), 'form: test run missing'

    # save
    page.locator('#wa-review-save').click()
    page.wait_for_timeout(500)
    wait_network_idle(page)
    screenshot(page, '06-form-saved')
    assert 'templateMarket' in page.url or page.locator('.wa-market').is_visible(), 'form: not redirected to market'
    print('=== FORM creation OK ===')

def test_chat_creation(page):
    print('=== Testing CHAT creation ===')
    page.goto(f'{BASE_URL}?view=workAssistant')
    wait_network_idle(page)
    page.locator('#wa-template-creator-btn').click()
    wait_network_idle(page)
    screenshot(page, '07-chat-creator')

    # chat tab is default
    assert page.locator('.wa-creator-tab[data-tab="chat"]').is_visible(), 'chat: chat tab missing'

    # answer conversation questions (5 turns reach confirm)
    inputs = ['客户方案', '销售经理', '客户名称、预算范围、核心需求、竞品情况', '方案文档，正式商务', '用于销售拜访后快速输出客户方案']
    for i, text in enumerate(inputs):
        input_box = page.locator('#wa-conversation-input')
        if not input_box.is_visible():
            break
        input_box.fill(text)
        page.locator('#wa-conversation-send').click()
        page.wait_for_timeout(1500)
        screenshot(page, f'08-chat-turn-{i}')

    # enter review
    page.locator('#wa-conversation-confirm-review').click()
    page.wait_for_timeout(500)
    wait_network_idle(page)
    screenshot(page, '09-chat-review')
    assert page.locator('.wa-creator-review-layout').is_visible(), 'chat: review layout not visible'
    assert page.locator('#wa-review-save').is_visible(), 'chat: save button missing'

    page.locator('#wa-review-save').click()
    page.wait_for_timeout(500)
    wait_network_idle(page)
    screenshot(page, '10-chat-saved')
    assert page.locator('.wa-market').is_visible(), 'chat: not redirected to market'
    print('=== CHAT creation OK ===')

def test_extract_creation(page):
    print('=== Testing EXTRACT creation ===')
    page.goto(f'{BASE_URL}?view=workAssistant')
    wait_network_idle(page)
    page.locator('#wa-template-creator-btn').click()
    wait_network_idle(page)

    page.locator('.wa-creator-tab[data-tab="extract"]').click()
    page.wait_for_timeout(300)
    screenshot(page, '11-extract')

    page.locator('#extract-name').fill('会议纪要模板（提取测试）')
    page.locator('#extract-example').fill('''会议主题：Q3 产品规划
时间：2024-09-01
参与人：张三、李四
讨论内容：
1. 确定下季度核心功能为智能客服。
2. 市场部需配合输出推广方案。
下一步：技术部于 9 月 10 日前完成原型。''')

    page.locator('#wa-extract-start').click()
    page.wait_for_timeout(800)
    wait_network_idle(page)
    screenshot(page, '12-extract-preview')

    assert page.locator('#wa-extract-confirm-review').is_visible(), 'extract: confirm review button missing'
    page.locator('#wa-extract-confirm-review').click()
    page.wait_for_timeout(500)
    wait_network_idle(page)
    screenshot(page, '13-extract-review')
    assert page.locator('.wa-creator-review-layout').is_visible(), 'extract: review layout not visible'
    assert page.locator('#wa-review-save').is_visible(), 'extract: save button missing'

    page.locator('#wa-review-save').click()
    page.wait_for_timeout(500)
    wait_network_idle(page)
    screenshot(page, '14-extract-saved')
    assert page.locator('.wa-market').is_visible(), 'extract: not redirected to market'
    print('=== EXTRACT creation OK ===')

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        try:
            test_form_creation(page)
            test_chat_creation(page)
            test_extract_creation(page)
            print('\n=== ALL TESTS PASSED ===')
        except AssertionError as e:
            print(f'\n=== TEST FAILED: {e} ===')
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    main()
