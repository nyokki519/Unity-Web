"""Failure injection and actual keyboard focus/release regressions for solo bonus."""
import argparse,unittest
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:3400');args=p.parse_args()
class BonusLifecycle(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.p.stop()
 def setUp(self):self.context=self.browser.new_context(viewport={'width':390,'height':844});self.page=self.context.new_page()
 def tearDown(self):self.context.close()
 def test_catalog_failure_does_not_block_standalone(self):
  self.page.route('**/api/catalog',lambda route:route.abort());self.page.goto(args.url+'/?bonus=jackpot');expect(self.page.locator('.bonus-screen')).to_be_visible(timeout=3000);self.page.get_by_role('button',name='チャレンジ開始',exact=True).click();expect(self.page.locator('#bonus-remaining')).to_have_text('100')
 def test_delayed_catalog_cannot_replace_later_bonus_navigation(self):
  page=self.page;pending=[];catalog=self.context.request.get(args.url+'/api/catalog').json();page.route('**/api/catalog',lambda route:pending.append(route));page.goto(args.url+'/?bonus=jackpot',wait_until='commit');expect(page.locator('.bonus-screen')).to_be_visible();page.get_by_role('button',name='← Unity MIXへ戻る',exact=True).click();page.get_by_role('button',name='ルームをつくる ↗',exact=True).click();page.get_by_role('button',name='大穴チャレンジで遊ぶ',exact=True).click();page.get_by_role('button',name='チャレンジ開始',exact=True).click();self.assertTrue(pending);pending[0].fulfill(status=200,json=catalog);page.wait_for_timeout(300);expect(page.locator('.bonus-screen')).to_be_visible();expect(page.locator('#bonus-remaining')).to_have_text('100')
 def test_keyboard_release_after_focus_change_stops_firing(self):
  page=self.page;page.goto(args.url+'/?bonus=jackpot');expect(page.locator('.bonus-screen')).to_be_visible();page.get_by_role('button',name='チャレンジ開始',exact=True).click();hold=page.get_by_role('button',name='押している間に連続発射',exact=True);hold.focus();page.keyboard.down('Space');page.keyboard.press('Tab');page.keyboard.up('Space');count=page.locator('#bonus-fired').inner_text();page.wait_for_timeout(1200);expect(hold).to_have_attribute('aria-pressed','false');expect(page.locator('#bonus-fired')).to_have_text(count)
 def test_leave_cleans_up_and_reentry_starts_fresh(self):
  page=self.page;page.goto(args.url+'/?bonus=jackpot');page.get_by_role('button',name='チャレンジ開始',exact=True).click();page.get_by_role('button',name='1球発射',exact=True).click();page.get_by_role('button',name='← Unity MIXへ戻る',exact=True).click();expect(page.locator('.bonus-screen')).to_have_count(0);page.get_by_role('button',name='大穴チャレンジで遊ぶ',exact=True).click();expect(page.get_by_role('button',name='チャレンジ開始',exact=True)).to_be_visible();page.get_by_role('button',name='チャレンジ開始',exact=True).click();expect(page.locator('#bonus-fired')).to_have_text('0');expect(page.locator('#bonus-remaining')).to_have_text('100')
if __name__=='__main__':unittest.main(argv=['bonus_lifecycle_check'])
