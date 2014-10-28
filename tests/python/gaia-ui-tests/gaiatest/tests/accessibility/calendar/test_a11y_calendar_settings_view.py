# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.calendar.app import Calendar


class TestCalendarSettingsViewAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.calendar = Calendar(self.marionette)
        self.calendar.launch()
        self.calendar.a11y_click_settings()

    def test_a11y_calendar_settings_view(self):

        settings = self.calendar.settings

        # Check that the local calencar is checked
        self.assertTrue(self.marionette.find_element(
            *settings._calendar_local_checkbox_locator).get_attribute('checked'))
        self.assertTrue(self.marionette.find_element(
            *settings._calendar_local_locator).get_attribute('aria-selected') == 'true')

        # Uncheck the local calendar
        self.accessibility.click(self.marionette.find_element(*settings._calendar_local_locator))

        # Check that the local calendar is unchecked
        settings.wait_for_calendar_unchecked()
        settings.wait_for_a11y_calendar_unchecked()
