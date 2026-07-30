from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:5174'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(f'{BASE_URL}?view=workAssistant')
    page.wait_for_timeout(1000)
    page.locator('#wa-template-creator-btn').click()
    page.wait_for_timeout(500)
    
    inputs = ['客户方案', '销售经理', '客户名称、预算范围、核心需求、竞品情况', '方案文档，正式商务', '用于销售拜访后快速输出客户方案']
    for i, text in enumerate(inputs):
        input_box = page.locator('#wa-conversation-input')
        if not input_box.is_visible():
            print(f'Step {i}: input not visible, state likely confirm')
            break
        input_box.fill(text)
        page.locator('#wa-conversation-send').click()
        page.wait_for_timeout(1500)
        print(f'After input {i+1}: "{text}"')
        # Check if confirm button exists
        confirm = page.locator('#wa-conversation-confirm-review')
        print(f'  confirm visible: {confirm.is_visible()}')
        print(f'  input visible: {input_box.is_visible()}')
    
    page.screenshot(path='e:\\dmtplat-test\\debug-chat-final.png', full_page=True)
    browser.close()
