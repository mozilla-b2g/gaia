# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import time

from marionette.marionette_test import parameterized
from marionette_driver import By, Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.search.app import Search


class TestBrowserNavigation(GaiaImageCompareTestCase):
    _academic_page_locator = (By.ID, 'latest')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.connect_to_local_area_network()

    # websites used in this test are offline copies from http://htmlandcssbook.com/code-samples/
    def test_browser_navigation(self):

        self.test_url = self.marionette.absolute_url('sample_websites/darkness/index.html')

        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)
        browser.wait_for_page_to_load()

        #TODO: remove the reloading and rechecking for elements when bug 1128034 is resolved,
        browser.tap_reload_button()
        browser.wait_for_page_to_load()
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: 'Darkness' == m.title)
        Wait(self.marionette).until(lambda m: m.find_element(
            *self._academic_page_locator).is_displayed())
        self.take_screenshot()

        self.marionette.switch_to_frame()
        self.scroll(browser._browser_frame_locator, 'down', 400)
        self.take_screenshot()
