# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings

class TestSliderVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # make accessibility settings visible
        self.data_layer.set_setting(
            'accessibility.screenreader-show-settings', True)

        self.settings = Settings(self.marionette)
        self.settings.launch()

    def test_a11y_slider_visibility(self):
        accessibility_settings = self.settings.open_accessibility()
        screenreader_settings = accessibility_settings.a11y_open_screenreader_settings()

        # Rate and volume settings should be invisible when screen reader is disabled
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *screenreader_settings._screen_reader_volume_slider_locator)))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *screenreader_settings._screen_reader_rate_slider_locator)))

        # Turn on screen reader
        self.data_layer.set_setting('accessibility.screenreader', True)

        # Both rate and volume sliders should be visible when screen reader is on
        self.wait_for_condition(lambda x:
            self.accessibility.is_visible(self.marionette.find_element(
                *screenreader_settings._screen_reader_volume_slider_locator)))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *screenreader_settings._screen_reader_rate_slider_locator)))

        # Turn screen reader off again
        self.data_layer.set_setting('accessibility.screenreader', False)

        # Rate and volume settings should be invisible when screen reader is disabled
        self.wait_for_condition(lambda x:
            self.accessibility.is_hidden(self.marionette.find_element(
                *screenreader_settings._screen_reader_volume_slider_locator)))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *screenreader_settings._screen_reader_rate_slider_locator)))
