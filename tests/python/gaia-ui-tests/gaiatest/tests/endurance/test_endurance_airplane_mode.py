# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 168 minutes

from gaiatest import GaiaEnduranceTestCase

import os
import datetime
import time


class TestEnduranceAirplaneMode(GaiaEnduranceTestCase):

    _cell_data_menu_item_locator = ('id', 'menuItem-cellularAndData')
    _carrier_name_locator = ('id', 'dataNetwork-desc')
    _utility_tray_locator = ('css selector', '#utility-tray')
    _airplane_mode_button_locator = ('css selector', '#quick-settings-airplane-mode')
    _airplane_mode_enabled_button_locator = ('css selector', '#quick-settings-airplane-mode[data-enabled]')
    _airplane_mode_enabled_status_locator =  ('css selector', '.sb-icon-flight-mode')

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # Connect wifi
        self.data_layer.enable_wifi()
        self.data_layer.connect_to_wifi(self.testvars['wifi'])

    def test_endurance_airplane_mode(self):
        self.drive(test=self.airplane_mode, app='homescreen')

    def airplane_mode(self):
        # Verify airplane mode icon NOT displayed
        self.wait_for_element_not_displayed(*self._airplane_mode_enabled_status_locator)

        # Verify wifi is enabled (from test_settings_wifi)
        self.assertTrue(self.data_layer.is_wifi_connected(self.testvars['wifi']), "WiFi not connected but should be")

        # Verify cell network is enabled
        self.verify_cell(True)

        # Open the utility tray
        self.marionette.execute_script("window.wrappedJSObject.UtilityTray.show()")
        self.wait_for_element_displayed(*self._utility_tray_locator)

        # Click airplane mode button to activate
        self.wait_for_element_displayed(*self._airplane_mode_button_locator)
        airplane_mode_button = self.marionette.find_element(*self._airplane_mode_button_locator)
        self.marionette.tap(airplane_mode_button)

        # Sleep
        time.sleep(20)

        # Close the utility tray
        self.marionette.execute_script("window.wrappedJSObject.UtilityTray.hide()")
        self.wait_for_element_not_displayed(*self._utility_tray_locator)

        # Verify ARE in airplane mode - check for icon
        self.wait_for_element_displayed(*self._airplane_mode_enabled_status_locator)

        # Ensure wifi is NOT connected now
        self.assertFalse(self.data_layer.is_wifi_connected(self.testvars['wifi']), "WiFi is connected but should not be")

        # Verify cell network is not enabled
        self.verify_cell(False)

        # Open the utility tray
        self.marionette.execute_script("window.wrappedJSObject.UtilityTray.show()")
        self.wait_for_element_displayed(*self._utility_tray_locator)

        # Click airplane mode button to deactivate
        self.wait_for_element_displayed(*self._airplane_mode_enabled_button_locator)
        airplane_mode_button = self.marionette.find_element(*self._airplane_mode_enabled_button_locator)
        self.marionette.tap(airplane_mode_button)

        # Sleep
        time.sleep(20)

        # Close the utility tray
        self.marionette.execute_script("window.wrappedJSObject.UtilityTray.hide()")
        self.wait_for_element_not_displayed(*self._utility_tray_locator)

        # Sleep between reps
        time.sleep(3)

    def verify_cell(self, expect_enabled):
        # Verify cell network enabled/disabled via settings menu (some code from test_settings_cell)
        self.app = self.apps.launch('Settings')
        self.wait_for_element_displayed(*self._cell_data_menu_item_locator)
        cell_data_menu_item = self.marionette.find_element(*self._cell_data_menu_item_locator)
        self.marionette.tap(cell_data_menu_item)
        time.sleep(2)

        if expect_enabled:
            # Verify that a carrier is displayed
            self.wait_for_element_displayed(*self._carrier_name_locator)
            self.assertTrue(len(self.marionette.find_element(*self._carrier_name_locator).text) > 0, "Cell network not enabled but should be")
        else:
            # Cellular and Data menu item should be grayed out because airplane mode,
            # so tapping shouldn't open new screen; should be on same screen
            self.wait_for_element_not_displayed(*self._carrier_name_locator)
            self.wait_for_element_displayed(*self._cell_data_menu_item_locator)

        # Close settings
        self.close_app()
        self.marionette.switch_to_frame()
        time.sleep(2)
