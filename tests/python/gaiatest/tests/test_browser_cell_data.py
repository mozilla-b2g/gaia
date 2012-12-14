# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestBrowserCellData(GaiaTestCase):

    # Firefox/chrome locators
    _awesome_bar_locator = ("id", "url-input")
    _url_button_locator = ("id", "url-button")
    _throbber_locator = ("id", "throbber")
    _browser_frame_locator = ('css selector', 'iframe[mozbrowser]')

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.data_layer.disable_wifi()
        self.data_layer.enable_cell_data()

        # launch the app
        self.app = self.apps.launch('Browser')

    def test_browser_cell_data(self):
        # https://moztrap.mozilla.org/manage/case/1328/

        awesome_bar = self.marionette.find_element(*self._awesome_bar_locator)
        awesome_bar.click()
        awesome_bar.send_keys('http://mozqa.com/data/firefox/layout/mozilla.html')

        self.marionette.find_element(*self._url_button_locator).click()

        # Bump up the timeout due to slower cell data speeds
        self.wait_for_condition(lambda m: not self.is_throbber_visible(), timeout=40)

        browser_frame = self.marionette.find_element(
            *self._browser_frame_locator)

        self.marionette.switch_to_frame(browser_frame)

        heading = self.marionette.find_element('id', 'page-title')
        self.assertEqual(heading.text, 'We believe that the internet should be public, open and accessible.')

    def tearDown(self):

        # close the app
        if hasattr(self, 'app'):
            self.apps.kill(self.app)

        self.data_layer.disable_cell_data()

        GaiaTestCase.tearDown(self)

    def is_throbber_visible(self):
        return self.marionette.find_element(*self._throbber_locator).get_attribute('class') == 'loading'
