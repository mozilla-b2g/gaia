# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings

class TestScreenReaderAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.settings = Settings(self.marionette)
        self.settings.launch()

    def test_a11y_screen_reader_settings(self):
        accessibility_settings = self.settings.a11y_open_accessibility_settings()

	# make sure the switch is visible and of, plus controls are hidden
	self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *screen_reader_enable_switch_locator)))
	# FIXME ensure switch is off by default
	self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *_screen_reader_captions_locator)))
	self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *_screen_reader_volume_slider_locator)))
	self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *_screen_reader_rate_slider_locator)))

        # turn on screen reader
        screen_reader_settings.a11y_toggle_screen_reader()
	
	# make sure the controls appear
	# FIXME need to interact with the confirm dialog first     

