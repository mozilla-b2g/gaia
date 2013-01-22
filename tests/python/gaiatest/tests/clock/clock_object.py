# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from gaiatest import GaiaTestCase
from marionette import MarionetteTestCase
from marionette import Marionette

_alarm_create_new_locator = ('id', 'alarm-new')

_clock_day_date = ('id', 'clock-day-date')
_analog_clock_display = ('id', 'analog-clock-svg')
_digital_clock_display = ('id', 'digital-clock-display')
_digital_clock_hour24_state = ('id', 'clock-hour24-state')

_all_alarms = ('css selector', '#alarms li')
_alarm_save_locator = ('id', 'alarm-done')
_banner_countdown_notification_locator = ('id', 'banner-countdown')
_picker_container = ('id', 'picker-container')
_alarm_name = ('xpath', "//input[@placeholder='Alarm']")
_repeat_menu = ('id', 'repeat-menu')
_sound_menu = ('id', 'sound-menu')
_snooze_menu = ('id', 'snooze-menu')
_new_alarm_label = ('name', 'alarm.label')
_alarm_label = ('css selector', "div.alarmList-detail div.label")
_alarm_checked_status = ('css selector', 'li label.alarmList #input-enable')
_alarm_checked_status_button = ('css selector', 'li label.alarmList')
_alarm_item = ('id', 'alarm-item')
_alarm_delete_button = ('id', 'alarm-delete')


def create_alarm(self):
    """ create a new alarm for test """
    self.wait_for_element_displayed(*_alarm_create_new_locator)
    # find the origin alarms' number
    initial_alarms_count = len(self.marionette.find_elements(*_all_alarms))
    alarm_create_new = self.marionette.find_element(*_alarm_create_new_locator)
    self.marionette.tap(alarm_create_new)
    self.wait_for_element_displayed(*_alarm_save_locator)
    alarm_save = self.marionette.find_element(*_alarm_save_locator)
    self.marionette.tap(alarm_save)
    self.wait_for_element_displayed(*_alarm_create_new_locator)
    self.wait_for_condition(lambda m: len(m.find_elements(*_all_alarms)) > initial_alarms_count)


def delete_alarm(self):
    """ delete the new alarm """
    self.wait_for_element_displayed(*_alarm_create_new_locator)
    # find the origin alarms' number
    initial_alarms_count = len(self.marionette.find_elements(*_all_alarms))
    self.wait_for_element_displayed(*_alarm_item)
    alarm_item = self.marionette.find_element(*_alarm_item)
    self.marionette.tap(alarm_item)
    self.wait_for_element_displayed(*_alarm_delete_button)
    alarm_delete = self.marionette.find_element(*_alarm_delete_button)
    self.marionette.tap(alarm_delete)
    self.wait_for_element_displayed(*_alarm_create_new_locator)
    self.wait_for_condition(lambda m: len(m.find_elements(*_all_alarms)) < initial_alarms_count)
