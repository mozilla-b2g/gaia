# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestBrowserLAN(GaiaTestCase):

    # Firefox/chrome locators
    _awesome_bar_locator = ("id", "url-input")
    _url_button_locator = ("id", "url-button")
    _throbber_locator = ("id", "throbber")
    _browser_frame_locator = ('css selector', 'iframe[mozbrowser]')
    _page_title_locator = ("id", "page-title")

    def setUp(self):
        GaiaTestCase.setUp(self)

        if self.wifi:
            self.data_layer.enable_wifi()
            self.data_layer.connect_to_wifi(self.testvars['wifi'])

        # launch the app
        self.app = self.apps.launch('Browser')

        self.wait_for_condition(lambda m: m.execute_script("return window.wrappedJSObject.Browser.hasLoaded;"))

    def test_browser_lan(self):
        # https://moztrap.mozilla.org/manage/case/1327/

        awesome_bar = self.marionette.find_element(*self._awesome_bar_locator)
        awesome_bar.send_keys('http://mozqa.com/data/firefox/layout/mozilla.html')

        url_button = self.marionette.find_element(*self._url_button_locator)
        self.marionette.tap(url_button)

        # TODO see if we can reduce this timeout in the future. >10 seconds is poor UX
        self.wait_for_condition(lambda m: not self.is_throbber_visible(), timeout=20)

        browser_frame = self.marionette.find_element(
            *self._browser_frame_locator)

        self.marionette.switch_to_frame(browser_frame)

        self.wait_for_element_present(*self._page_title_locator)
        heading = self.marionette.find_element(*self._page_title_locator)
        self.assertEqual(heading.text, 'We believe that the internet should be public, open and accessible.')

    def tearDown(self):
        if self.wifi:
            self.data_layer.disable_wifi()
        GaiaTestCase.tearDown(self)

    def is_throbber_visible(self):
        return self.marionette.find_element(*self._throbber_locator).get_attribute('class') == 'loading'
