# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from marionette.wait import Wait
from marionette.errors import StaleElementException
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Clock(Base):

    name = 'Clock'

    _alarm_view_locator = (By.ID, 'edit-alarm')
    _alarm_create_new_locator = (By.ID, 'alarm-new')
    _all_alarms_locator = (By.CSS_SELECTOR, '#alarms li')
    _visible_clock_locator = (By.CSS_SELECTOR, '#clock-view .visible')
    _banner_countdown_notification_locator = (By.ID, 'banner-countdown')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_displayed(*self._visible_clock_locator)
        self.wait_for_element_displayed(*self._alarm_create_new_locator)

    @property
    def alarms(self):
        return [self.Alarm(self.marionette, alarm) for alarm in self.marionette.find_elements(*self._all_alarms_locator)]

    @property
    def banner_notification(self):
        self.wait_for_element_displayed(
            *self._banner_countdown_notification_locator)
        return self.marionette.find_element(
            *self._banner_countdown_notification_locator).text

    def dismiss_banner(self):
        self.wait_for_element_displayed(
            *self._banner_countdown_notification_locator)
        # We can't tap to clear the banner as sometimes it taps the underlying alarm changing the UI
        self.wait_for_element_not_displayed(
            *self._banner_countdown_notification_locator)

    def tap_new_alarm(self):
        self.wait_for_element_displayed(*self._alarm_create_new_locator)
        self.marionette.find_element(*self._alarm_create_new_locator).tap()
        from gaiatest.apps.clock.regions.alarm import NewAlarm
        return NewAlarm(self.marionette)

    class Alarm(PageRegion):

        _label_locator = (By.CSS_SELECTOR, '.label')
        _check_box_locator = (By.CSS_SELECTOR, '.input-enable')
        _enable_button_locator = (By.CSS_SELECTOR, '.alarmList.alarmEnable')

        @property
        def label(self):
            return self.root_element.find_element(*self._label_locator).text

        @property
        def is_alarm_active(self):
            return self.root_element.find_element(*self._check_box_locator).is_selected()

        def tap_checkbox(self):
            self.root_element.find_element(*self._enable_button_locator).tap()

        def wait_for_checkbox_to_change_state(self, value):
            Wait(self.marionette, ignored_exceptions=StaleElementException).until(lambda m: self.is_alarm_active == value)

        def tap(self):
            self.root_element.tap()
            # Bug 1022204 - The panel shows, slides out and back in. Marionette cannot interpret displayed state safely
            time.sleep(0.5)
            from gaiatest.apps.clock.regions.alarm import EditAlarm
            return EditAlarm(self.marionette)
