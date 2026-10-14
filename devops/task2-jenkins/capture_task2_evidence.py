import os
import sys
import time

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def capture_task2_evidence():
    print("🚀 Initializing browser to capture Task 2 evidence...")
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    
    driver = webdriver.Chrome(options=options)
    
    try:
        # 1. Jenkins Dashboard
        print("📸 Capturing Jenkins Dashboard (http://localhost:8080)...")
        driver.get("http://localhost:8080")
        time.sleep(3)
        dash_path = os.path.join(OUTPUT_DIR, "01_jenkins_dashboard.png")
        driver.save_screenshot(dash_path)
        print(f"✅ Saved: {dash_path}")

        # 2. Jenkins Job View
        print("📸 Capturing Jenkins Job (http://localhost:8080/job/finalyear_project_devsla/)...")
        driver.get("http://localhost:8080/job/finalyear_project_devsla/")
        time.sleep(2)
        job_path = os.path.join(OUTPUT_DIR, "02_jenkins_job_view.png")
        driver.save_screenshot(job_path)
        print(f"✅ Saved: {job_path}")

        # 3. Console Output of Successful Build
        print("📸 Capturing Jenkins Console Output (http://localhost:8080/job/finalyear_project_devsla/1/console)...")
        driver.get("http://localhost:8080/job/finalyear_project_devsla/1/console")
        time.sleep(2)
        console_path = os.path.join(OUTPUT_DIR, "03_jenkins_console_output.png")
        driver.save_screenshot(console_path)
        print(f"✅ Saved: {console_path}")

        # 4. Jenkins Job Configuration
        print("📸 Capturing Jenkins Job Configuration (http://localhost:8080/job/finalyear_project_devsla/configure)...")
        driver.get("http://localhost:8080/job/finalyear_project_devsla/configure")
        time.sleep(3)
        cfg_path = os.path.join(OUTPUT_DIR, "05_jenkins_job_configure.png")
        driver.save_screenshot(cfg_path)
        print(f"✅ Saved: {cfg_path}")

        # 4. Running RecruitX Homepage
        print("📸 Capturing Running RecruitX Homepage (http://localhost:5173)...")
        driver.get("http://localhost:5173")
        time.sleep(3)
        home_path = os.path.join(OUTPUT_DIR, "04_recruitx_homepage_running.png")
        driver.save_screenshot(home_path)
        print(f"✅ Saved: {home_path}")

        print("\n🎉 All 4 genuine Task 2 screenshots captured successfully!")

    except Exception as e:
        print(f"❌ Error during capture: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    capture_task2_evidence()
