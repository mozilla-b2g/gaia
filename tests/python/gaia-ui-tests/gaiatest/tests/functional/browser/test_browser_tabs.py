# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser


class TestBrowserTabs(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        if self.device.is_desktop_b2g or self.data_layer.is_wifi_connected():
            self.test_url = self.marionette.absolute_url('mozilla.html')
        else:
            self.test_url = 'http://mozqa.com/data/firefox/layout/mozilla.html'

    def test_browser_tabs(self):
        """ Open a new tab.
        Open Browser.
        Open tab menu.
        Add a new tab.
        Assert that the new tab has opened.
        Load a website.
        Switch back to the first tab.
        """
        browser = Browser(self.marionette)
        browser.launch()

        # Open tab menu.
        browser.tap_tab_badge_button()

        # Add a new tab and load a website.
        browser.tap_add_new_tab_button()
        browser.go_to_url(self.test_url)
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')

        # Assert that the new tab has opened.
        browser.switch_to_chrome()
        self.assertEqual(browser.displayed_tabs_number, 2)
        # Assert that the displayed tabs number is equal with the actual number of opened tabs.
        self.assertEqual(browser.displayed_tabs_number, browser.tabs_count)

        # Switch back to the first tab.
        browser.tap_tab_badge_button()
        browser.tabs[0].tap_tab()
        self.assertTrue(browser.is_awesome_bar_visible)
