# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestSliderVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # make accessibility settings visible
        self.data_layer.set_setting('accessibility.show-settings', True)

        self.settings = Settings(self.marionette)
        self.settings.launch()

    def test_a11y_slider_visibility(self):
        accessibility_settings = self.settings.a11y_open_accessibility_settings()

        # Both rate and volume sliders should be visible
        self.assertTrue(self.is_element_displayed(
            *accessibility_settings._screen_reader_volume_slider_locator))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *accessibility_settings._screen_reader_volume_slider_locator)))
        self.assertTrue(self.is_element_displayed(
            *accessibility_settings._screen_reader_rate_slider_locator))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *accessibility_settings._screen_reader_rate_slider_locator)))
