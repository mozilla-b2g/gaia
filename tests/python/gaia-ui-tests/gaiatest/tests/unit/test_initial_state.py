# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact


class TestInitialState(GaiaTestCase):

    homescreen_frame_locator = (By.CSS_SELECTOR, 'div.homescreen iframe')

    def test_initial_state(self):
        self.check_initial_state()

    def test_state_after_reset(self):
        # push media files
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')
        self.push_resource('VID_0001.3gp', destination='DCIM/100MZLLA')
        self.push_resource('MUS_0001.mp3')

        # change volume
        self.data_layer.set_volume(5)

        # connect to wifi network
        if (self.testvars.get('wifi') and self.device.has_wifi):
            self.data_layer.connect_to_wifi()
            self.data_layer.disable_wifi()

        # insert contacts
        self.data_layer.insert_contact(MockContact())
        self.data_layer.insert_contact(MockContact())

        # move away from home screen
        self.marionette.switch_to_frame(
            self.marionette.find_element(*self.homescreen_frame_locator))
        self.marionette.execute_script('window.wrappedJSObject.GridManager.goToPage(1);')
        self.marionette.switch_to_frame()

        # lock screen
        self.lockscreen.lock()

        self.cleanUp()
        self.check_initial_state()

    def check_initial_state(self):
        self.assertFalse(self.lockscreen.is_locked)

        self.assertFalse(self.data_layer.is_wifi_enabled)
        self.assertFalse(self.data_layer.is_cell_data_enabled)
        self.assertFalse(self.device.is_online)

        if self.device.has_wifi:
            self.data_layer.enable_wifi()
            self.assertEqual(self.data_layer.known_networks, [{}])
            self.data_layer.disable_wifi()

        self.assertEqual(self.data_layer.get_setting('audio.volume.master'), 0)

        self.assertEqual(self.data_layer.media_files, [])

        self.assertEqual(self.data_layer.all_contacts, [])

        # check we're on the home screen
        self.marionette.switch_to_frame(
            self.marionette.find_element(*self.homescreen_frame_locator))
        self.assertEqual(self.marionette.execute_script(
            'return window.wrappedJSObject.GridManager.pageHelper.getCurrentPageNumber();'), 0)
        self.marionette.switch_to_frame()
