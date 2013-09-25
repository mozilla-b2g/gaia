# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 60 minutes

import time

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.browser.app import Browser

class TestEnduranceBrowserWifi(GaiaEnduranceTestCase):

    _page_title_locator = ("id", "page-title")

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Want wifi only
        self.data_layer.disable_cell_data()
        self.data_layer.enable_wifi()
        self.data_layer.connect_to_wifi(self.testvars['wifi'])

    def test_endurance_browser_wifi(self):
        self.drive(test=self.browser_wifi, app='browser')

    def browser_wifi(self):
        # Start browser and load page and verify, code taken from test_browser_cell_data.py
        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html')

        browser.switch_to_content()

        self.wait_for_element_present(*self._page_title_locator, timeout=120)
        heading = self.marionette.find_element(*self._page_title_locator)
        self.assertEqual(heading.text, 'We believe that the internet should be public, open and accessible.')

        # Wait a couple of seconds with page displayed
        time.sleep(2)

        # Close the browser using home button
        self.app = browser
        self.close_app()

        # Sleep between iterations
        time.sleep(10)

    def tearDown(self):
        GaiaEnduranceTestCase.tearDown(self)

    def is_throbber_visible(self):
        return self.marionette.find_element(*self._throbber_locator).get_attribute('class') == 'loading'
