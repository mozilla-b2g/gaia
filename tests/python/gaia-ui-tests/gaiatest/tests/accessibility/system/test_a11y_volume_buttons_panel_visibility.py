# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestVolumeButtonsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.settings = Settings(self.marionette)
        self.settings.launch()

    def toggle_screen_reader(self):
        self.marionette.switch_to_frame()

        self.device.press_release_volume_up_then_down_n_times(3)
        time.sleep(3)
        self.device.press_release_volume_up_then_down_n_times(3)

        self.apps.switch_to_displayed_app()

    def test_a11y_volume_buttons(self):
        # Open accessibility settings panel
        accessibility_settings = self.settings.open_accessibility()

        # Panel should not be visible by default
        self.assertFalse(self.data_layer.get_setting(
            'accessibility.screenreader-show-settings'))
        self.assertFalse(self.is_element_displayed(
            *accessibility_settings._accessibility_screenreader_menu_item_locator))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *accessibility_settings._accessibility_screenreader_menu_item_locator)))

        self.toggle_screen_reader()

        # Panel should become visible after screen reader turned ON
        self.assertTrue(self.data_layer.get_setting(
            'accessibility.screenreader-show-settings'))
        self.assertTrue(self.is_element_displayed(
            *accessibility_settings._accessibility_screenreader_menu_item_locator))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *accessibility_settings._accessibility_screenreader_menu_item_locator)))

        self.toggle_screen_reader()

        # Panel should still be visible
        self.assertTrue(self.data_layer.get_setting(
            'accessibility.screenreader-show-settings'))
        self.assertTrue(self.is_element_displayed(
            *accessibility_settings._accessibility_screenreader_menu_item_locator))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *accessibility_settings._accessibility_screenreader_menu_item_locator)))
