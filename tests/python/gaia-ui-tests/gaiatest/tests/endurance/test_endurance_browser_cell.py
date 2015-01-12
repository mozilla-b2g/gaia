# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: xxx minutes

import time

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.search.app import Search


class TestEnduranceBrowserCell(GaiaEnduranceTestCase):

    _page_title_locator = ("id", "page-title")

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Want cell network only
        self.data_layer.disable_wifi()
        self.data_layer.connect_to_cell_data()

    def test_endurance_browser_cell(self):
        self.drive(test=self.browser_cell, app='browser')

    def browser_cell(self):
        # Start browser and load page and verify, code taken from test_browser_cell_data.py
        search = Search(self.marionette)
        search.launch()

        browser = search.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html')

        browser.wait_for_page_to_load(120)
        browser.switch_to_content()

        self.wait_for_element_present(*self._page_title_locator, timeout=120)
        heading = self.marionette.find_element(*self._page_title_locator)
        self.assertEqual(heading.text, 'We believe that the internet should be public, open and accessible.')

        # Wait a couple of seconds with page displayed
        time.sleep(2)

        # Close browser via cards view
        self.app_under_test = "search"
        self.close_app()
        self.app_under_test = "browser"

        # Sleep between iterations
        time.sleep(10)

    def tearDown(self):
        GaiaEnduranceTestCase.tearDown(self)

    def is_throbber_visible(self):
        return self.marionette.find_element(*self._throbber_locator).get_attribute('class') == 'loading'
