# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Clock(Base):
    name = 'Clock'
    _alarm_create_new_locator = (By.ID, 'alarm-new')
    _clock_view_locator = (By.ID, 'alarm-tab')
    _visible_clock_locator = (By.CSS_SELECTOR, '#clock-view .visible')
    _clock_views = {"stopwatch":"stopwatch-tab", "alarm":"alarm-tab", "timer":"timer-tab"}
    _banner_countdown_notification_locator = (By.ID, 'banner-countdown')



    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._visible_clock_locator))))
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._alarm_create_new_locator))))

    def switch_view(self, view_name):
        Wait(self.marionette).until(
            expected.element_present(*(By.ID, self._clock_views.get(view_name)))).tap()
        if view_name == 'stopwatch':
            from gaiatest.apps.clock.regions.stopwatch import StopWatch
            return StopWatch(self.marionette)
        elif view_name == 'timer':
            from gaiatest.apps.clock.regions.timer import Timer
            return Timer(self.marionette)
        else:
            from gaiatest.apps.clock.regions.alarm import Alarm
            return Alarm(self.marionette)

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
