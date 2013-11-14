# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser


class TestBrowserKeyboard(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_browser_keyboard(self):

        # This test runs on TBPL only because other tests cover it on device

        browser = Browser(self.marionette)
        browser.launch()

        search_url = 'http://mozqa.com/data/firefox/layout/mozilla.html'

        browser.go_to_url(search_url)
        search_src = browser.url_src

        # Assert that the typed url is the same as the src attribute of the browser iframe
        self.assertEqual(search_url, search_src)
