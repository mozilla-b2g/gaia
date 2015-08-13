# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.clock.app import Clock
from gaiatest.apps.base import PageRegion


class Alarm(Clock):
    _edit_alarm_view_locator = (By.ID, 'edit-alarm')
    _all_alarm_items_locator = (By.CSS_SELECTOR, '#alarms li')
    _visible_clock_locator = (By.CSS_SELECTOR, '#clock-view .visible')

    def __init__(self, marionette):
        Clock.__init__(self, marionette)
        view = self.marionette.find_element(*self._clock_view_locator)
        Wait(self.marionette).until(lambda m: view.location['x'] == 0 and view.is_displayed())

    @property
    def alarm_items(self):
        return [self.AlarmItem(self.marionette, alarm_item) for alarm_item in
                self.marionette.find_elements(*self._all_alarm_items_locator)]

    def tap_new_alarm(self):
        new_alarm = Wait(self.marionette).until(
            expected.element_present(*self._alarm_create_new_locator))
        Wait(self.marionette).until(expected.element_displayed(new_alarm))
        new_alarm.tap()
        from gaiatest.apps.clock.regions.new_alarm import NewAlarm
        return NewAlarm(self.marionette)

    class AlarmItem(PageRegion):

        _label_locator = (By.CSS_SELECTOR, '.label')
        _check_box_locator = (By.CSS_SELECTOR, '.input-enable')
        _enable_button_locator = (By.CSS_SELECTOR, '.alarmList.alarmEnable')
        _time_locator = (By.CSS_SELECTOR, '.time')

        def time(self):
            return self.root_element.find_element(*self._time_locator).text

        @property
        def label(self):
            return self.root_element.find_element(*self._label_locator).text

        @property
        def is_alarm_active(self):
            return self.root_element.find_element(*self._check_box_locator).is_selected()

        def tap_checkbox(self):
            self.root_element.find_element(*self._enable_button_locator).tap()

        def wait_for_checkbox_to_change_state(self, value):
            checkbox = self.marionette.find_element(*self._check_box_locator)
            Wait(self.marionette).until(lambda m: checkbox.is_selected() == value)

        def tap(self):
            self.root_element.tap()
            from gaiatest.apps.clock.regions.new_alarm import EditAlarm
            return EditAlarm(self.marionette)
