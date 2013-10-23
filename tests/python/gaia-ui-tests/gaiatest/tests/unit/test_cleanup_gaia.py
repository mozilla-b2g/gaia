# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact


class TestCleanupGaia(GaiaTestCase):

    homescreen_frame_locator = (By.CSS_SELECTOR, 'div.homescreen iframe')

    def test_cleanup_gaia(self):
        self.check_initial_state()

        # change volume
        self.data_layer.set_volume(5)
        self.assertEqual(self.data_layer.get_setting(
            'audio.volume.content'), 5)

        # connect to wifi network
        if (self.testvars.get('wifi') and self.device.has_wifi):
            self.data_layer.connect_to_wifi()
            self.assertTrue(len(self.data_layer.known_networks) > 0)

        # insert contacts
        self.data_layer.insert_contact(MockContact())
        self.data_layer.insert_contact(MockContact())
        self.assertEqual(len(self.data_layer.all_contacts), 2)

        # move away from home screen
        self.marionette.switch_to_frame(
            self.marionette.find_element(*self.homescreen_frame_locator))
        self.marionette.execute_script(
            'window.wrappedJSObject.GridManager.goToPage(1);')
        self.assertEqual(self.marionette.execute_script("""
var manager = window.wrappedJSObject.GridManager;
return manager.pageHelper.getCurrentPageNumber();
"""), 1)
        self.marionette.switch_to_frame()

        # lock screen
        self.lockscreen.lock()
        self.assertTrue(self.lockscreen.is_locked)

        self.cleanup_gaia()
        self.check_initial_state()

    def check_initial_state(self):
        self.assertFalse(self.lockscreen.is_locked)

        if self.device.has_wifi:
            self.assertEqual(len(self.data_layer.known_networks), 0)

        if self.device.has_mobile_connection:
            self.assertFalse(self.data_layer.is_cell_data_enabled)

        self.assertEqual(self.data_layer.get_setting(
            'audio.volume.content'), 0)

        self.assertEqual(self.data_layer.all_contacts, [])

        # check we're on the home screen
        self.marionette.switch_to_frame(
            self.marionette.find_element(*self.homescreen_frame_locator))
        self.assertEqual(self.marionette.execute_script("""
var manager = window.wrappedJSObject.GridManager;
return manager.pageHelper.getCurrentPageNumber();
"""), 0)
        self.marionette.switch_to_frame()
