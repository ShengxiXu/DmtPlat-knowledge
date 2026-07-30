import sys
import re
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:5175/?view=contentTemplates"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()
        page.goto(BASE_URL)
        page.wait_for_timeout(2500)

        first_card = page.locator(".ctm-template-card").first
        expect(first_card).to_be_visible()
        original_name = first_card.locator(".ctm-card-title").inner_text()
        first_card.click()
        page.wait_for_timeout(500)

        page.locator('[data-action="use-preview"]').click()
        page.wait_for_timeout(1200)

        # Should be on standalone content document editor
        expect(page.locator(".ctm-doc-editor")).to_be_visible()

        # Title input should be prefilled
        title_input = page.locator('.ctm-doc-title-input')
        expect(title_input).to_be_visible()
        expect(title_input).to_have_value(re.compile(re.escape(original_name)))

        # Source template info shown
        expect(page.locator(".ctm-doc-source")).to_contain_text(original_name)

        # Editor body has editable fields
        expect(page.locator(".ctm-doc-editor-body")).to_be_visible()

        # Type into first textarea/field
        first_field = page.locator('.ctm-doc-editor-body input, .ctm-doc-editor-body textarea').first
        expect(first_field).to_be_visible()
        first_field.fill('测试内容')

        # Save document
        page.locator('[data-action="save-doc"]').click()
        page.wait_for_timeout(800)

        # Toast appears
        expect(page.locator(".ctm-toast")).to_contain_text("已保存")

        print("PASS: use-template opens standalone content editor and supports saving")
        browser.close()


if __name__ == "__main__":
    main()
