# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.clock.app import Clock


class NewAlarm(Clock):

    _alarm_name_locator = (By.ID, 'alarm-name')
    _repeat_menu_locator = (By.ID, 'repeat-menu')
    _sound_menu_locator = (By.ID, 'sound-menu')
    _snooze_menu_locator = (By.ID, 'snooze-menu')
    _done_locator = (By.ID, 'alarm-done')
    _time_button_locator = (By.XPATH, "//li[input[@id='time-select']]")

    _hour_picker_locator = (By.CSS_SELECTOR, '#value-picker-hours div')
    _minutes_picker_locator = (By.CSS_SELECTOR, '#value-picker-minutes div')
    _hour24_picker_locator = (By.CSS_SELECTOR, '#value-picker-hour24-state div')

    def type_alarm_label(self, value):
        label = self.marionette.find_element(*self._alarm_name_locator)
        label.clear()
        label.send_keys(value)
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

    def wait_for_panel_to_load(self):
        screen_width = int(self.marionette.execute_script('return window.innerWidth'))
        done = self.marionette.find_element(*self._done_locator)
        self.wait_for_condition(lambda m: (done.location['x'] + done.size['width']) == screen_width)

    def tap_done(self):
        self.marionette.find_element(*self._done_locator).tap()

        clock = Clock(self.marionette)
        clock.wait_for_banner_displayed()
        return clock

    @property
    def hour(self):
        return self.marionette.find_element(*self._current_element(*self._hour_picker_locator)).text

    def spin_hour(self):
        self.wait_for_element_displayed(*self._hour_picker_locator)
        if int(self.hour) > 6:
                self._flick_menu_down(self._hour_picker_locator)
        else:
            self._flick_menu_up(self._hour_picker_locator)
        time.sleep(1)

    @property
    def minute(self):
        return self.marionette.find_element(*self._current_element(*self._minutes_picker_locator)).text

    def spin_minute(self):
        if int(self.minute) > 30:
            self._flick_menu_down(self._minutes_picker_locator)
        else:
            self._flick_menu_up(self._minutes_picker_locator)

        time.sleep(1)

    @property
    def hour24(self):
        return self.marionette.find_element(*self._current_element(*self._hour24_picker_locator)).text

    def spin_hour24(self):
        hour24_picker = self.marionette.find_element(*self._current_element(*self._hour24_picker_locator))
        hour24_picker_move_y = hour24_picker.size['height'] * 2
        hour24_picker_mid_x = hour24_picker.size['width'] / 2
        hour24_picker_mid_y = hour24_picker.size['height'] / 2

        if self.hour24 == 'AM':
            Actions(self.marionette).flick(hour24_picker, hour24_picker_mid_x, hour24_picker_mid_y, hour24_picker_mid_x, hour24_picker_mid_y - hour24_picker_move_y)
        else:
            Actions(self.marionette).flick(hour24_picker, hour24_picker_mid_x, hour24_picker_mid_y, hour24_picker_mid_x, hour24_picker_mid_y + hour24_picker_move_y)

        time.sleep(1)

    def tap_time(self):
        self.marionette.find_element(*self._time_button_locator).tap()

    def _flick_menu_up(self, locator):
        self.wait_for_element_displayed(*self._current_element(*locator))
        current_element = self.marionette.find_element(*self._current_element(*locator))
        next_element = self.marionette.find_element(*self._next_element(*locator))

        #TODO: update this with more accurate Actions
        action = Actions(self.marionette)
        action.press(next_element)
        action.move(current_element)
        action.release()
        action.perform()

    def _flick_menu_down(self, locator):
        self.wait_for_element_displayed(*self._current_element(*locator))
        current_element = self.marionette.find_element(*self._current_element(*locator))
        next_element = self.marionette.find_element(*self._next_element(*locator))

        #TODO: update this with more accurate Actions
        action = Actions(self.marionette)
        action.press(current_element)
        action.move(next_element)
        action.release()
        action.perform()

    def _current_element(self, method, target):
        return (method, '%s.picker-unit.active' % target)

    def _next_element(self, method, target):
        return (method, '%s.picker-unit.active + div' % target)


class EditAlarm(NewAlarm):

    _alarm_delete_button_locator = (By.ID, 'alarm-delete')

    def __init__(self, marionette):
        NewAlarm.__init__(self, marionette)
        self.wait_for_element_displayed(*self._alarm_delete_button_locator)

    def tap_delete(self):
        self.marionette.find_element(*self._alarm_delete_button_locator).tap()
        return Clock(self.marionette)
