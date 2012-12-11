# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestClock(GaiaTestCase):

    _alarm_create_new_locator = ('id', 'alarm-new')
    _alarm_save_locator = ('id', 'alarm-done')
    _banner_countdown_notification_locator = ('id', 'banner-countdown')
    _picker_container = ('id', 'picker-container')
    _alarm_name = (('xpath', "//input[@placeholder='Alarm']"))
    _repeat_menu = ('id', 'repeat-menu')
    _sound_menu = ('id', 'sound-menu')
    _snooze_menu = ('id', 'snooze-menu')
    _all_alarms = ('css selector', '#alarms li')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        # launch the Clock app
        self.app = self.apps.launch('Clock')

    def test_create_new_alarm(self):
        # https://moztrap.mozilla.org/manage/case/1772/

        self.wait_for_element_displayed(*self._alarm_create_new_locator)

        # Get the number of alarms set, before adding the new alarm
        initial_alarms_count = len(self.marionette.find_elements(*self._all_alarms))

        # create a new alarm with the default values that are available
        self.marionette.find_element(*self._alarm_create_new_locator).click()
        self.marionette.find_element(*self._alarm_save_locator).click()

        # verify the banner-countdown message appears
        self.wait_for_element_displayed(*self._banner_countdown_notification_locator)
        alarm_msg = self.marionette.find_element(*self._banner_countdown_notification_locator).text
        self.assertTrue('The alarm is set for' in alarm_msg, 'Actual banner message was: "' + alarm_msg + '"')

        # Get the number of alarms set after the new alarm was added
        new_alarms_count = len(self.marionette.find_elements(*self._all_alarms))

        # Ensure the new alarm has been added and is displayed
        self.assertTrue(initial_alarms_count < new_alarms_count,
            'Alarms count did not increment')

    def test_all_items_present_new_alarm(self):

        # Wait for the new alarm screen to load
        self.wait_for_element_displayed(*self._alarm_create_new_locator)

        picker_container_tagname = self.marionette.find_element(*self._picker_container).tag_name
        alarm_name_txt = self.marionette.find_element(*self._alarm_name).text
        repeat_selector_txt = self.marionette.find_element(*self._repeat_menu).text
        sound_selector_txt = self.marionette.find_element(*self._sound_menu).text
        snooze_selector_txt = self.marionette.find_element(*self._snooze_menu).text

        # Ensure that the picker container exists and is displayed
        self.assertEquals(picker_container_tagname, 'div',
            'Container was %s' % picker_container_tagname)
        self.assertTrue(self.marionette.find_element(*self._picker_container)
            .is_displayed(), 'Picker container not displayed.')

        # Ensure the alarm name input has the default text Alarm
        self.assertEquals(alarm_name_txt, 'Alarm',
            'Alarm name was %s' % alarm_name_txt)

        # If either Never is not the text or it does not exist the below will fail
        self.assertEquals(repeat_selector_txt, 'Never',
            'Actual repeat selector text: %s' % repeat_selector_txt)

        # If either Classic is not the text or it does not exist the below will fail
        self.assertEquals(sound_selector_txt, 'Classic',
            'Actual sound selector text: %s' % sound_selector_txt)

        # If either 5 minutes is not the text or it does not exist the below will fail
        self.assertEquals(snooze_selector_txt, '5 minutes',
            'Actual snooze selector text: %s' % snooze_selector_txt)

    def tearDown(self):

        # close the app
        if hasattr(self, 'app'):
            self.apps.kill(self.app)

        GaiaTestCase.tearDown(self)
