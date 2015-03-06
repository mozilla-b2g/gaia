# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search


class TestBrowserLAN(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = 'http://mozqa.com/data/firefox/layout/mozilla.html'

    def test_browser_lan(self):
        """
        https://moztrap.mozilla.org/manage/case/1327/
        """
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')
