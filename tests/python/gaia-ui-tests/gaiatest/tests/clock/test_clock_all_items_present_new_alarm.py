# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.tests.clock import clock_object


class TestClockTestAllItemsPresentNewAlarm(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.app = self.apps.launch('Clock')

    def test_all_items_present_new_alarm(self):
        # Wait for the new alarm screen to load
        self.wait_for_element_displayed(*clock_object._alarm_create_new_locator)
        alarm_create_new = self.marionette.find_element(*clock_object._alarm_create_new_locator)
        self.marionette.tap(alarm_create_new)

        # Ensure the picker is displayed
        picker = self.marionette.find_element(*clock_object._picker_container)
        self.assertTrue(picker.is_displayed(), 'Picker container not displayed.')

        # Ensure label has the default placeholder and text
        label = self.marionette.find_element(*clock_object._alarm_name)
        self.assertEquals(label.get_attribute('placeholder'), 'Alarm')
        self.assertEquals(label.text, '')

        # Ensure repeat has the default value
        repeat = self.marionette.find_element(*clock_object._repeat_menu)
        self.assertEquals(repeat.text, 'Never')

        # Ensure sound has the default value
        sound = self.marionette.find_element(*clock_object._sound_menu)
        self.assertEquals(sound.text, 'Classic Buzz')

        # Ensure snooze has the default value
        snooze = self.marionette.find_element(*clock_object._snooze_menu)
        self.assertEquals(snooze.text, '5 minutes')
