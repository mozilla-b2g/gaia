# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Clock(Base):
    name = 'Clock'
    _visible_clock_locator = (By.CSS_SELECTOR, '#clock-view .visible')
    _clock_views = {"stopwatch": "stopwatch-tab", "alarm": "alarm-tab", "timer": "timer-tab"}

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._visible_clock_locator))))

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


