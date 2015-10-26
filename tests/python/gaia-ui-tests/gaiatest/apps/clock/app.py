# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

<<<<<<< HEAD
from gaiatest.apps.base import Base
=======
from gaiatest.apps.base import Base, PageRegion
from gaiatest.form_controls.binarycontrol import InvisibleHtmlBinaryControl
>>>>>>> 11e4c572e3a2690e4ef1e8436beba55587ffed6d


class Clock(Base):
    name = 'Clock'
    _visible_clock_locator = (By.CSS_SELECTOR, '#clock-view .visible')
    _clock_views = {"stopwatch": "stopwatch-tab", "alarm": "alarm-tab", "timer": "timer-tab"}

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._visible_clock_locator))))
<<<<<<< HEAD

    def switch_view(self, view_name):
        Wait(self.marionette).until(
            expected.element_present(*(By.ID, self._clock_views.get(view_name)))).tap()
        if view_name == 'stopwatch':
            from gaiatest.apps.clock.regions.stopwatch import StopWatch
            return StopWatch(self.marionette)
        elif view_name == 'timer':
            from gaiatest.apps.clock.regions.timer import Timer
            return Timer(self.marionette)
        elif view_name == 'alarm':
            from gaiatest.apps.clock.regions.alarm import Alarm
            return Alarm(self.marionette)
        else:
            raise AttributeError('{} is not a view that you can switch to'.format(view_name))

=======
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
            return self._checkbox.is_checked

        def enable(self):
            self._checkbox.enable()

        def disable(self):
            self._checkbox.disable()

        @property
        def _checkbox(self):
            return InvisibleHtmlBinaryControl(self.marionette, self._check_box_locator, self._enable_button_locator)
>>>>>>> 11e4c572e3a2690e4ef1e8436beba55587ffed6d

