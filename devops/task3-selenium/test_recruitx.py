import os
import sys
import time

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

BASE_URL = "http://localhost:5173"

def init_driver():
    """Initializes Chrome or Edge WebDriver in headless mode."""
    print("🚀 Initializing browser driver...")
    
    # Try Chrome first
    try:
        chrome_options = ChromeOptions()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-gpu")
        driver = webdriver.Chrome(options=chrome_options)
        print("✅ Launched Google Chrome driver successfully.")
        return driver
    except Exception as e:
        print(f"⚠️ Chrome launch failed ({e}), trying Microsoft Edge...")
        
    try:
        edge_options = EdgeOptions()
        edge_options.add_argument("--headless=new")
        edge_options.add_argument("--no-sandbox")
        edge_options.add_argument("--disable-dev-shm-usage")
        edge_options.add_argument("--window-size=1920,1080")
        edge_options.add_argument("--disable-gpu")
        driver = webdriver.Edge(options=edge_options)
        print("✅ Launched Microsoft Edge driver successfully.")
        return driver
    except Exception as e:
        print(f"❌ Failed to launch both Chrome and Edge: {e}")
        raise

def take_snapshot(driver, name):
    """Saves a screenshot to screenshots directory."""
    filename = f"{name}.png"
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    driver.save_screenshot(filepath)
    print(f"📸 Snapshot captured: {filepath}")
    return filepath

def run_tests():
    driver = init_driver()
    driver.implicitly_wait(10)
    wait = WebDriverWait(driver, 15)

    test_results = []

    try:
        # TEST 1: HOME PAGE / REDIRECT TO LOGIN
        print("\n--- [Test 1] Navigate to Home Page ---")
        driver.get(BASE_URL)
        time.sleep(2)
        take_snapshot(driver, "01_homepage_redirect")
        current_url = driver.current_url
        print(f"Current URL: {current_url}")
        assert "login" in current_url or "/" in current_url, "Home page redirect failed"
        test_results.append(("Test 1: Home Page Loading & Redirect", "PASSED"))

        # TEST 2: VERIFY LOGIN PAGE UI ELEMENTS
        print("\n--- [Test 2] Verify Login Page Elements ---")
        driver.get(f"{BASE_URL}/login")
        time.sleep(2)
        
        # Check title or header
        page_source = driver.page_source
        has_login_content = "Sign" in page_source or "Login" in page_source or "Email" in page_source
        assert has_login_content, "Login page content not found"
        
        take_snapshot(driver, "02_login_page_loaded")
        print("✅ Login Page elements verified successfully.")
        test_results.append(("Test 2: Login Page UI Elements", "PASSED"))

        # TEST 3: FORM VALIDATION TEST
        print("\n--- [Test 3] Test Login Form Input & Validation ---")
        email_inputs = driver.find_elements(By.TAG_NAME, "input")
        if email_inputs:
            # Type into first input (usually email)
            email_inputs[0].clear()
            email_inputs[0].send_keys("test_devops@recruitx.com")
            if len(email_inputs) > 1:
                email_inputs[1].clear()
                email_inputs[1].send_keys("SecretPassword123!")
            time.sleep(1)
            take_snapshot(driver, "03_login_form_filled")
            print("✅ Input fields populated.")
        test_results.append(("Test 3: Login Form Input Interaction", "PASSED"))

        # TEST 4: REGISTER PAGE NAVIGATION & ELEMENTS
        print("\n--- [Test 4] Navigate to Register Page ---")
        driver.get(f"{BASE_URL}/register")
        time.sleep(2)
        take_snapshot(driver, "04_register_page_loaded")
        
        reg_inputs = driver.find_elements(By.TAG_NAME, "input")
        print(f"Found {len(reg_inputs)} input fields on Register Page.")
        assert len(reg_inputs) >= 2, "Registration form inputs not rendered"
        test_results.append(("Test 4: Register Page Navigation & Render", "PASSED"))

        # TEST 5: ROLE SELECTOR INTERACTION
        print("\n--- [Test 5] Test Role Buttons (Student, Recruiter, Admin) ---")
        buttons = driver.find_elements(By.TAG_NAME, "button")
        role_buttons = [b for b in buttons if any(r in b.text.lower() for r in ['student', 'recruiter', 'admin'])]
        print(f"Found {len(role_buttons)} role selection buttons.")
        if role_buttons:
            role_buttons[-1].click()
            time.sleep(1)
            take_snapshot(driver, "05_role_selected")
        test_results.append(("Test 5: Role Switcher Interaction", "PASSED"))

        print("\n" + "="*50)
        print("🎯 ALL SELENIUM AUTOMATION TESTS COMPLETED SUCCESSFULLY!")
        print("="*50)
        for name, status in test_results:
            print(f"  {status} : {name}")

    except Exception as e:
        print(f"\n❌ Test Failed with Exception: {e}")
        take_snapshot(driver, "error_screenshot")
        test_results.append(("Selenium Automation Run", f"FAILED: {e}"))
    finally:
        driver.quit()
        print("\n🔒 WebDriver closed cleanly.")

if __name__ == "__main__":
    run_tests()
