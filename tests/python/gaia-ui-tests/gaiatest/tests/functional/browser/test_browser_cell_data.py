# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser


class TestBrowserCellData(GaiaTestCase):

    _page_title_locator = (By.ID, 'page-title')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.connect_to_cell_data()

    def test_browser_cell_data(self):
        """https://moztrap.mozilla.org/manage/case/1328/"""

        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html', timeout=120)

        browser.switch_to_content()

        self.wait_for_element_present(*self._page_title_locator, timeout=120)
        heading = self.marionette.find_element(*self._page_title_locator)
        self.assertEqual(heading.text, 'We believe that the internet should be public, open and accessible.')
