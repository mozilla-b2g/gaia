# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact


class TestCleanupGaia(GaiaTestCase):

    homescreen_frame_locator = (By.CSS_SELECTOR, '#homescreen iframe')
    homescreen_all_icons_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')

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

        # move to homescreen and scroll last icon into view
        self.marionette.switch_to_frame(
            self.marionette.find_element(*self.homescreen_frame_locator))
        homescreen_last_icon = self.marionette.find_elements(*self.homescreen_all_icons_locator)[-1]
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [homescreen_last_icon])
        self.assertGreater(self.marionette.execute_script(
            "return window.scrollY"), 0)

        # move away from homescreen
        self.marionette.switch_to_frame()

        # lock screen
        self.device.lock()
        self.assertTrue(self.device.is_locked)

        self.cleanup_gaia()
        self.check_initial_state()

    def check_initial_state(self):
        self.assertFalse(self.device.is_locked)
        self.assertEqual(self.apps.displayed_app.name, 'Homescreen')

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
        self.marionette.switch_to_frame()
