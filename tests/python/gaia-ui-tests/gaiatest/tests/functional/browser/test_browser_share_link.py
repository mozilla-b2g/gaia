# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search


class TestBrowserShare(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')
        self.test_url = 'http://mozqa.com/data/firefox/layout/mozilla.html'

    def test_browser_share_to_messages(self):
        search = Search(self.marionette)
        search.launch()

        browser = search.go_to_url(self.test_url)
        browser.tap_menu_button()
        browser.tap_share()
        messages = browser.tap_share_to_messages()
        messages.wait_for_message_input_displayed()
        self.assertEqual(messages.message, self.test_url)
