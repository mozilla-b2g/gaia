# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings

class TestCaptionsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Make accessibility settings visible
        self.data_layer.set_setting('accessibility.screenreader-show-settings', True)
        self.data_layer.set_setting('accessibility.screenreader-captions', False)

        self.settings = Settings(self.marionette)
        self.settings.launch()

    def test_a11y_captions(self):
        accessibility_settings = self.settings.open_accessibility()
        screenreader_settings = accessibility_settings.a11y_open_screenreader_settings()

        # Captions should be invisible when screen reader is disabled
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *screenreader_settings._screen_reader_captions_locator)))

        # Turn on screen reader
        self.data_layer.set_setting('accessibility.screenreader', True)

        # Captions should be visible when screen reader is on
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *screenreader_settings._screen_reader_captions_locator)))

        # Turn on color filters
        screenreader_settings.a11y_toggle_captions()

        # Captions settings should be set
        self.wait_for_condition(
            lambda m: self.data_layer.get_setting('accessibility.screenreader-captions'))
