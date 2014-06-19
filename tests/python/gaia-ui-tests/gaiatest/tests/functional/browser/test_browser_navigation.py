# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import By

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser


class TestBrowserNavigation(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        if self.device.is_desktop_b2g or self.data_layer.is_wifi_connected():
            self.test_data = {
                'url': self.marionette.absolute_url('xhtmlTest.html'),
                'title1': 'XHTML Test Page',
                'link': (By.ID, 'linkId'),
                'title2': 'We Arrive Here'}
        else:
            self.test_data = {
                'url': 'http://mozqa.com/data/firefox/layout/mozilla.html',
                'title1': 'Mozilla',
                'link': (By.CSS_SELECTOR, '#community a'),
                'title2': 'Mozilla Community'}

    def test_browser_back_button(self):
        browser = Browser(self.marionette)
        browser.launch()
        browser.go_to_url(self.test_data['url'])

        browser.switch_to_content()
        self.assertEqual(self.marionette.title, self.test_data['title1'])
        link = self.marionette.find_element(*self.test_data['link'])
        # TODO: remove the explicit scroll once bug 833370 is fixed
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [link])
        link.tap()
        self.assertEqual(self.marionette.title, self.test_data['title2'])

        browser.switch_to_chrome()
        browser.tap_back_button()
        browser.switch_to_content()
        self.assertEqual(self.marionette.title, self.test_data['title1'])

        browser.switch_to_chrome()
        browser.tap_forward_button()
        browser.switch_to_content()
        self.assertEqual(self.marionette.title, self.test_data['title2'])
