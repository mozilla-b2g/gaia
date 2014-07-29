# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestVolumeButtonsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # make accessibility settings hidden by default
        self.data_layer.set_setting('accessibility.show-settings', False)

        self.settings = Settings(self.marionette)
        self.settings.launch()

    def test_a11y_volume_buttons(self):

        # Panel should not be visible by default
        self.assertFalse(self.data_layer.get_setting(
            'accessibility.show-settings'))
        self.assertFalse(self.is_element_displayed(
            *self.settings._accessibility_menu_item_locator))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.settings._accessibility_menu_item_locator)))

        self.marionette.switch_to_frame()

        self.device.press_release_volume_up_then_down_n_times(3)
        time.sleep(3)
        self.device.press_release_volume_up_then_down_n_times(3)

        self.apps.switch_to_displayed_app()

        # Panel should become visible after screen reader turned ON
        self.assertTrue(self.data_layer.get_setting(
            'accessibility.show-settings'))
        self.assertTrue(self.data_layer.get_setting(
            'accessibility.show-settings'))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.settings._accessibility_menu_item_locator)))

        self.marionette.switch_to_frame()

        self.device.press_release_volume_up_then_down_n_times(3)
        time.sleep(3)
        self.device.press_release_volume_up_then_down_n_times(3)

        self.apps.switch_to_displayed_app()

        # Panel should not be visible again
        self.assertFalse(self.data_layer.get_setting(
            'accessibility.show-settings'))
        self.assertFalse(self.is_element_displayed(
            *self.settings._accessibility_menu_item_locator))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.settings._accessibility_menu_item_locator)))
