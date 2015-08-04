# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Clock(Base):

    name = 'Clock'
    origin = 'app://clock.gaiamobile.org'

    _alarm_view_locator = (By.ID, 'edit-alarm')
    _alarm_create_new_locator = (By.ID, 'alarm-new')
    _all_alarms_locator = (By.CSS_SELECTOR, '#alarms li')
    _visible_clock_locator = (By.CSS_SELECTOR, '#clock-view .visible')
    _banner_countdown_notification_locator = (By.ID, 'banner-countdown')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._visible_clock_locator))))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._alarm_create_new_locator))))

    @property
    def alarms(self):
        return [self.Alarm(self.marionette, alarm) for alarm in self.marionette.find_elements(*self._all_alarms_locator)]

    @property
    def banner_notification(self):
        banner = Wait(self.marionette).until(
            expected.element_present(*self._banner_countdown_notification_locator))
        Wait(self.marionette).until(expected.element_displayed(banner))
        return banner.text

    def dismiss_banner(self):
        banner = Wait(self.marionette).until(
            expected.element_present(*self._banner_countdown_notification_locator))
        Wait(self.marionette).until(expected.element_displayed(banner))
        # We can't tap to clear the banner as sometimes it taps the underlying alarm changing the UI
        Wait(self.marionette).until(expected.element_not_displayed(banner))

    def tap_new_alarm(self):
        new_alarm = Wait(self.marionette).until(
            expected.element_present(*self._alarm_create_new_locator))
        Wait(self.marionette).until(expected.element_displayed(new_alarm))
        new_alarm.tap()
        from gaiatest.apps.clock.regions.alarm import NewAlarm
        return NewAlarm(self.marionette)

    class Alarm(PageRegion):

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
            from gaiatest.apps.clock.regions.alarm import EditAlarm
            return EditAlarm(self.marionette)
