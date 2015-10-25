# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.system.regions.fullscreen_dialog import TrackingDialog, FullScreenDialog


class TestBrowserNavigation(GaiaTestCase):

    def modify_settings(self, settings):
        settings['privacy.trackingprotection.shown'] = False
        return settings

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.test_url = self.marionette.absolute_url('mozilla.html')
        self.test_url2 = 'https://people.mozilla.org/~fmarier/tracking-test/'

    def test_browser_back_button(self):
        search = Search(self.marionette)
        search.launch()

        tracking_dialog = TrackingDialog(self.marionette)
        self.assertTrue(tracking_dialog.is_displayed)

        browser = tracking_dialog.open_learn_more()
        # It takes a short while before the page is starting to load
        import time
        time.sleep(1)
        browser.wait_for_page_to_load()
        self.assertFalse(tracking_dialog.is_displayed)

        browser.go_to_url(self.test_url)

        self.assertTrue(tracking_dialog.is_displayed)
        self.assertFalse(tracking_dialog.is_tracking_protection_enabled)
        tracking_dialog.enable_tracking_protection()
        tracking_dialog.close_tracking_protection_dialog()

        browser.go_to_url(self.test_url2)
        browser.wait_for_page_to_load()
        browser.switch_to_content()
        element = self.marionette.find_element(By.ID, 'caption')
        Wait(self.marionette).until(lambda m: element.text == 'You have successfully enabled tracking protection. Please continue!')

        # Check that no tracking protection dialog appears anymore
        browser.switch_to_chrome()
        tracking_dialog = FullScreenDialog(self.marionette)
        self.assertTrue(tracking_dialog.is_empty)
