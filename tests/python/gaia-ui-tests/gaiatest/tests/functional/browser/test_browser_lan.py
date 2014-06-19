# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser


class TestBrowserLAN(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        if self.device.is_desktop_b2g or self.data_layer.is_wifi_connected():
            self.test_data = {
                'url': self.marionette.absolute_url('xhtmlTest.html'),
                'title': 'XHTML Test Page'}
        else:
            self.test_data = {
                'url': 'http://mozqa.com/data/firefox/layout/mozilla.html',
                'title': 'Mozilla'}

    def test_browser_lan(self):
        """https://moztrap.mozilla.org/manage/case/1327/"""
        browser = Browser(self.marionette)
        browser.launch()
        browser.go_to_url(self.test_data['url'])
        browser.switch_to_content()
        self.assertEqual(self.marionette.title, self.test_data['title'])
