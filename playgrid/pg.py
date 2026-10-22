import asyncio, math
from playwright.async_api import async_playwright
URL='http://localhost:8765/'; OUT='pshots'
async def main():
  async with async_playwright() as p:
    br = await p.chromium.launch()
    errs=[]
    def watch(pg,n):
      pg.on('console', lambda m: errs.append(f'{n}: {m.text}') if m.type=='error' and 'fonts.g' not in m.text and 'TUNNEL' not in m.text else None)
      pg.on('pageerror', lambda e: errs.append(f'{n} PAGEERROR: {e}'))
    ctx = await br.new_context(viewport={'width':1400,'height':900})
    A = await ctx.new_page(); watch(A,'A'); await A.goto(URL); await A.wait_for_timeout(600)
    await A.screenshot(path=f'{OUT}/1_home.png', full_page=True)
    # SOLO Draw & Guess practice, 30s turns
    await A.click('#practice-dg'); await A.wait_for_timeout(800)
    await A.click('#gs-btn'); await A.wait_for_timeout(300); await A.screenshot(path=f'{OUT}/2b_drawer.png'); await A.select_option('#s-time','30'); await A.select_option('#s-rounds','1'); await A.wait_for_timeout(200); await A.click('#drawer-done'); await A.wait_for_timeout(200)
    await A.screenshot(path=f'{OUT}/2_practice_lobby.png', full_page=True)
    print('players tab', await A.inner_text('[data-ptab=players]'))
    await A.click('#start-btn'); await A.wait_for_timeout(1200)
    for turn in range(3):
      # wait for choose or drawing
      if await A.locator('[data-choose]').count():
        await A.locator('[data-choose]').first.click(); await A.wait_for_timeout(600)
        box=await A.locator('canvas.dg-canvas').bounding_box(); x0,y0,w,h=box['x'],box['y'],box['width'],box['height']
        await A.mouse.move(x0+w*.3,y0+h*.3); await A.mouse.down()
        for i in range(20): await A.mouse.move(x0+w*(.3+i*.02), y0+h*(.3+.1*math.sin(i)))
        await A.mouse.up()
        if turn==0: await A.screenshot(path=f'{OUT}/3_me_drawing.png')
        await A.wait_for_timeout(16000)
        print('after my turn chat:', (await A.inner_text('#chat-log'))[-260:].replace('\n',' | '))
      else:
        await A.wait_for_timeout(5000)
        await A.screenshot(path=f'{OUT}/4_bot_drawing_t{turn}.png')
        hint = (await A.inner_text('#dg-word')).replace('\n',' ')
        print('bot drawing, hint:', hint)
        for guess in ['sun','house','tree','fish','apple','star','cat','heart','pizza']:
          await A.fill('#chat-input', guess); await A.press('#chat-input','Enter'); await A.wait_for_timeout(250)
          if 'you got it' in (await A.inner_text('#dg-word')).lower(): print('guessed:', guess); break
        await A.wait_for_timeout(3000)
      # wait through reveal into next choose
      for _ in range(40):
        await A.wait_for_timeout(500)
        if await A.locator('[data-choose]').count() or await A.locator('.result-card').count(): break
        txt = await A.inner_text('#dg-word')
        if 'Guess the word' in txt and turn<2: break
      if await A.locator('.result-card').count(): break
    await A.wait_for_timeout(1500)
    await A.screenshot(path=f'{OUT}/5_dg_result.png', full_page=True)
    print('result:', (await A.inner_text('.result-card')).replace('\n',' | ')[:200])
    # SOLO 4 in a Row vs bot
    await A.click('#leave-btn'); await A.wait_for_timeout(400)
    await A.click('#practice-fr'); await A.wait_for_timeout(800)
    await A.click('#start-btn'); await A.wait_for_timeout(800)
    for mv in range(25):
      if await A.locator('.result-card').count(): break
      if await A.locator('.fr-board.myturn').count():
        cols = A.locator('.fr-col:not([disabled])'); n=await cols.count()
        await cols.nth(min(n-1, mv%n)).click()
        if mv==2: await A.screenshot(path=f'{OUT}/6_fr_play.png')
      await A.wait_for_timeout(1700)
    await A.wait_for_timeout(800)
    await A.screenshot(path=f'{OUT}/7_fr_result.png', full_page=True)
    print('fr result title:', await A.inner_text('.result-title') if await A.locator('.result-title').count() else 'none')
    # Multi-tab quick check: A creates real lobby, B joins
    await A.click('#leave-btn'); await A.wait_for_timeout(300)
    await A.click('#hero-create'); await A.wait_for_timeout(900)
    code=(await A.inner_text('#room-code')).strip().lower().lstrip('#')
    B = await ctx.new_page(); watch(B,'B'); await B.goto(URL+'#'+code); await B.wait_for_timeout(500)
    await B.screenshot(path=f'{OUT}/8_join.png')
    await B.click('#join-btn'); await B.wait_for_timeout(1500)
    await A.click('#add-bot'); await A.wait_for_timeout(500)
    print('B sees players:', (await B.inner_text('.seat-row')).replace('\n',' | '))
    await A.screenshot(path=f'{OUT}/9_lobby_host.png', full_page=True)
    # phone view
    M = await (await br.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)).new_page(); watch(M,'M')
    await M.goto(URL); await M.wait_for_timeout(600); await M.screenshot(path=f'{OUT}/10_phone_home.png', full_page=True)
    await M.click('#practice-fr'); await M.wait_for_timeout(700); await M.click('#start-btn'); await M.wait_for_timeout(2500)
    await M.screenshot(path=f'{OUT}/11_phone_fr.png', full_page=True)
    await M.click('#leave-btn'); await M.wait_for_timeout(300); await M.click('#menu-btn'); await M.wait_for_timeout(300); await M.screenshot(path=f'{OUT}/12_phone_menu.png')
    await M.click('.sheet [data-go=settings]'); await M.wait_for_timeout(300); await M.screenshot(path=f'{OUT}/13_phone_settings.png', full_page=True)
    await A.click('.nav-item[data-go=lobbies]'); await A.click('.nav-item[data-go=lobbies]'); await A.wait_for_timeout(400); await A.screenshot(path=f'{OUT}/14_lobbies.png', full_page=True)
    await A.click('.nav-item[data-go=browse]'); await A.wait_for_timeout(300); await A.screenshot(path=f'{OUT}/15_browse.png', full_page=True)
    await A.click('.nav-item[data-go=settings]'); await A.wait_for_timeout(300); await A.screenshot(path=f'{OUT}/16_settings.png', full_page=True)
    sw = await M.evaluate('document.documentElement.scrollWidth')
    print('phone scrollWidth', sw)
    print('\n'.join(errs) or 'no errors')
    await br.close()
asyncio.run(main())
