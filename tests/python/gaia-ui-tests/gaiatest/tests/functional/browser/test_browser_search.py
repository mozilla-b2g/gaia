# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search


class TestBrowserSearch(GaiaTestCase):

    _google_search_input_locator = (By.NAME, 'q')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

    def test_browser_search(self):
        search = Search(self.marionette)
        search.launch()

        search_text = 'Mozilla'

        browser = search.go_to_url(search_text)

        browser.switch_to_content()
        self.wait_for_element_displayed(*self._google_search_input_locator)
        self.assertTrue(search_text in self.marionette.title)
        self.assertEqual(search_text,
                         self.marionette.find_element(*self._google_search_input_locator).get_attribute('value'))
