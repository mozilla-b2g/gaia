# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search


class TestBrowserNavigation(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_browser_back_button(self):
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)

        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')
        link = self.marionette.find_element(By.CSS_SELECTOR, '#community a')
        link.tap()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla Community')

        browser.switch_to_chrome()
        browser.tap_back_button()
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')

        browser.switch_to_chrome()
        browser.tap_forward_button()
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla Community')
