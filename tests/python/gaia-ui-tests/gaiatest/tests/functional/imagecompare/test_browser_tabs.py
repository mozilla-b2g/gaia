# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys

class TestBrowserTabs(GaiaTestCase):

    _page_title_locator = (By.ID, 'page-title')

    def setUp(self):
        GaiaTestCase.setUp(self)
        #self.connect_to_network()
        self.data_layer.connect_to_wifi()

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, '.')

    def test_browser_tabs(self):
        """ Open a new tab.
        Using Wifi/LAN

        Open Browser.
        Open tab menu.
        Add a new tab.
        Assert that the new tab has opened.
        Load a website ( http://mozqa.com/data/firefox/layout/mozilla.html)
        Switch back to the first tab.
        """
        browser = Browser(self.marionette)
        browser.launch()

        # Open tab menu.
        browser.tap_tab_badge_button()
        self.graphics.invoke_screen_capture(browser=browser)

        # Add a new tab and load a website.
        browser.tap_add_new_tab_button()
        browser.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html')
        browser.switch_to_content()
        self.wait_for_element_present(*self._page_title_locator)
        heading = self.marionette.find_element(*self._page_title_locator)
        self.assertEqual(heading.text, 'We believe that the internet should be public, open and accessible.')
        self.graphics.invoke_screen_capture(browser=browser)

        # Assert that the new tab has opened.
        browser.switch_to_chrome()
        self.assertEqual(browser.displayed_tabs_number, 2)
        # Assert that the displayed tabs number is equal with the actual number of opened tabs.
        self.assertEqual(browser.displayed_tabs_number, browser.tabs_count)
        self.graphics.invoke_screen_capture()

        # Switch back to the first tab.
        browser.tap_tab_badge_button()
        self.graphics.invoke_screen_capture(browser=browser)
        browser.tabs[0].tap_tab()
        self.assertTrue(browser.is_awesome_bar_visible)
        self.graphics.invoke_screen_capture(browser=browser)

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job(self)

        GaiaTestCase.tearDown(self)