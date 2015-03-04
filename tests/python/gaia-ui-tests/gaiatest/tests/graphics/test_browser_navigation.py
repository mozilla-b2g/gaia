# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.search.app import Search


class TestBrowserNavigation(GaiaImageCompareTestCase):

    _community_link_locator = (By.CSS_SELECTOR, '#community a')
    _community_history_section_locator = (By.ID, 'history')

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_browser_navigation(self):
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)

        browser.switch_to_content()
        self.verify_home_page()

        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')
        self.take_screenshot()
        community_link = self.marionette.find_element(*self._community_link_locator)
        # TODO: remove the explicit scroll once bug 833370 is fixed
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [community_link])
        community_link.tap()

        self.verify_community_page()
        self.take_screenshot()
        browser.switch_to_chrome()
        browser.tap_back_button()

        browser.switch_to_content()
        self.verify_home_page()
        self.take_screenshot()
        browser.switch_to_chrome()
        browser.tap_forward_button()

        browser.switch_to_content()
        self.verify_community_page()
        self.take_screenshot()

    def verify_home_page(self):
        self.wait_for_element_present(*self._community_link_locator)
        community_link = self.marionette.find_element(*self._community_link_locator)
        self.assertTrue(community_link.is_displayed(), 'The community link was not visible at mozilla.html.')

    def verify_community_page(self):
        self.wait_for_element_present(*self._community_history_section_locator)
        history_section = self.marionette.find_element(*self._community_history_section_locator)
        self.assertTrue(history_section.is_displayed(),
                        'The history section was not visible at mozilla_community.html.')
