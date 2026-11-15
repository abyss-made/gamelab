"""Verify the review viewer against the actual saved screenshots in Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, json, time, urllib.request

DOC = Path(__file__).resolve().parent
URL = 'http://127.0.0.1:45410'
server = subprocess.Popen(['python', '-m', 'http.server', '45410', '--bind', '127.0.0.1', '--directory', str(DOC)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
errors = []; checks = []
try:
    for attempt in range(100):
        try:
            urllib.request.urlopen(URL, timeout=1).close()
            break
        except Exception:
            if attempt == 99: raise
            time.sleep(.1)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
        page = browser.new_page(viewport={'width':1440,'height':1000})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        page.locator('#all').click()
        for width in ['1440','390','932']:
            page.select_option('#size', width)
            for state in ['opening','played','result','detail']:
                page.select_option('#state', state)
                page.wait_for_function('Array.from(document.querySelectorAll("#review .pair img")).length===20 && Array.from(document.querySelectorAll("#review .pair img")).every(i=>i.complete&&i.naturalWidth>0)')
                dims = page.locator('#review .pair img').evaluate_all('(imgs)=>imgs.map(i=>[i.naturalWidth,i.naturalHeight])')
                assert all(d == [int(width), {'1440':900,'390':844,'932':430}[width]] for d in dims), dims
                checks.append({'viewport':width, 'state':state, 'loadedPairs':10})
        page.locator('#ref').click()
        page.wait_for_function('Array.from(document.querySelectorAll(".reference img")).length===10&&Array.from(document.querySelectorAll(".reference img")).every(i=>i.complete&&i.naturalWidth>0)')
        checks.append('Ten attributed publisher reference images load')
        page.locator('#next').click()
        assert page.locator('#game').input_value() == 'pool'
        assert page.locator('#review section').count() == 1
        page.locator('#prev').click()
        assert page.locator('#game').input_value() == 'golf'
        page.locator('h1').click()
        page.keyboard.press('ArrowRight')
        assert page.locator('#game').input_value() == 'pool'
        page.locator('#review .zoom').first.click()
        assert page.locator('#lightbox').evaluate('(e)=>e.open')
        page.wait_for_function('document.querySelector("#full").complete&&document.querySelector("#full").naturalWidth>0')
        page.keyboard.press('Escape')
        assert not page.locator('#lightbox').evaluate('(e)=>e.open')
        assert page.evaluate('document.activeElement.classList.contains("zoom")')
        checks.append('Previous/next, arrow navigation, zoom, Escape and focus return')
        page.locator('#ref').click()
        page.select_option('#state','opening');page.select_option('#size','1440')
        page.screenshot(path=str(DOC/'gallery-desktop.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.select_option('#size','390')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(DOC/'gallery-phone.png'))
        checks.append('Viewer has no horizontal overflow at 390px')
        browser.close()
    assert not errors, errors
    (DOC/'test-results/gallery.json').write_text(json.dumps({'checks':checks,'errors':errors}, indent=2)+'\n')
    print('PASS: 120 comparison pairs, 10 references, viewer navigation/zoom/focus and mobile layout')
finally:
    server.terminate();server.wait(timeout=10)
