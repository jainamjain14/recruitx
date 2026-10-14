
import os
import unittest
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class RecruitXWebsiteTest(unittest.TestCase):

    def setUp(self):
        options = webdriver.ChromeOptions()
        options.add_argument("--start-maximized")
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 25)

    def test_login_and_dashboard(self):
        email = os.environ.get("RECRUITX_TEST_EMAIL")
        password = os.environ.get("RECRUITX_TEST_PASSWORD")

        if not email or not password:
            self.fail(
                "Set RECRUITX_TEST_EMAIL and "
                "RECRUITX_TEST_PASSWORD before running the test."
            )

        self.driver.get("http://localhost:5173/student")

        # Wait for the login form.
        email_field = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "input[type='email']")
            )
        )

        password_field = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "input[type='password']")
            )
        )

        email_field.clear()
        email_field.send_keys(email)

        password_field.clear()
        password_field.send_keys(password)

        # Click the form's submit button.
        submit_button = self.wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "button[type='submit']")
            )
        )
        submit_button.click()

        # Wait until the login form disappears.
        self.wait.until(
            EC.invisibility_of_element_located(
                (By.CSS_SELECTOR, "input[type='password']")
            )
        )

        # Allow the dashboard to finish rendering.
        self.wait.until(
            lambda d: d.execute_script(
                "return document.readyState"
            ) == "complete"
        )

        screenshot = (
            Path(__file__).resolve().parent
            / "recruitx-dashboard.png"
        )
        self.driver.save_screenshot(str(screenshot))

        print("\nLogin flow completed.")
        print(f"Current URL: {self.driver.current_url}")
        print(f"Dashboard screenshot: {screenshot}")

    def tearDown(self):
        if hasattr(self, "driver"):
            self.driver.quit()


if __name__ == "__main__":
    unittest.main(verbosity=2)
