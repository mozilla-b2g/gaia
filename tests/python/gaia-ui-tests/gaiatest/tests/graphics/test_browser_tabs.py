# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest.apps.browser.app import Browser
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase

class TestBrowserTabs(GaiaImageCompareTestCase):

    _page_title_locator = (By.ID, 'page-title')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.data_layer.connect_to_wifi()

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
        self.invoke_screen_capture(browser=browser)

        # Add a new tab and load a website.
        browser.tap_add_new_tab_button()
        browser.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html')
        browser.switch_to_content()
        self.wait_for_element_present(*self._page_title_locator)
        heading = self.marionette.find_element(*self._page_title_locator)
        self.assertEqual(heading.text, 'We believe that the internet should be public, open and accessible.')
        self.invoke_screen_capture(browser=browser)

        # Assert that the new tab has opened.
        browser.switch_to_chrome()
        self.assertEqual(browser.displayed_tabs_number, 2)
        # Assert that the displayed tabs number is equal with the actual number of opened tabs.
        self.assertEqual(browser.displayed_tabs_number, browser.tabs_count)
        self.invoke_screen_capture()

        # Switch back to the first tab.
        browser.tap_tab_badge_button()
        self.invoke_screen_capture(browser=browser)
        browser.tabs[0].tap_tab()
        self.assertTrue(browser.is_awesome_bar_visible)
        self.invoke_screen_capture(browser=browser)

    def tearDown(self):

        GaiaImageCompareTestCase.tearDown(self)