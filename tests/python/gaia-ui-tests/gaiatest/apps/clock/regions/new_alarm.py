# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.clock.app import Clock


class NewAlarm(Clock):

    _alarm_name_locator = (By.ID, 'alarm-name')
    _new_alarm_view_locator = (By.CSS_SELECTOR, 'section[data-panel-id="alarm_edit"]')
    _repeat_menu_locator = (By.ID, 'repeat-menu')
    _sound_menu_locator = (By.ID, 'sound-menu')
    _snooze_menu_locator = (By.ID, 'snooze-menu')
    _done_locator = (By.ID, 'alarm-done')
    _time_button_locator = (By.XPATH, "//li[input[@id='time-select']]")

    def __init__(self, marionette):
        Clock.__init__(self, marionette)
        view = self.marionette.find_element(*self._new_alarm_view_locator)
        Wait(self.marionette).until(lambda m: view.location['x'] == 0 and view.is_displayed())
        # Bug 1032852 This is to bust intermittents caused by this bug that causes keyboard not to appear upon tap
        time.sleep(1.5)

    def type_alarm_label(self, value):
        self.marionette.find_element(*self._alarm_name_locator).tap()
        self.keyboard.send(value)
        self.keyboard.dismiss()

    @property
    def alarm_label_placeholder(self):
        return self.marionette.find_element(*self._alarm_name_locator).get_attribute('placeholder')

    @property
    def alarm_repeat(self):
        return self.marionette.find_element(*self._repeat_menu_locator).text

    def select_repeat(self, value):
        self.marionette.find_element(*self._repeat_menu_locator).tap()
        self.select(value)

    @property
    def alarm_snooze(self):
        return self.marionette.find_element(*self._snooze_menu_locator).text

    def select_snooze(self, value):
        self.marionette.find_element(*self._snooze_menu_locator).tap()
        self.select(value)

    @property
    def alarm_sound(self):
        return self.marionette.find_element(*self._sound_menu_locator).text

    def select_sound(self, value):
        self.marionette.find_element(*self._sound_menu_locator).tap()
        self.select(value)

    def tap_done(self):
        done = Wait(self.marionette).until(expected.element_present(*self._done_locator))
        Wait(self.marionette).until(expected.element_displayed(done))
        done.tap()
        from gaiatest.apps.clock.regions.alarm import Alarm
        return Alarm(self.marionette)

    def tap_time(self):
        self.marionette.find_element(*self._time_button_locator).tap()
        from gaiatest.apps.system.regions.time_picker import TimePicker
        return TimePicker(self.marionette)


class EditAlarm(NewAlarm):

    def __init__(self, marionette):
        NewAlarm.__init__(self, marionette)
