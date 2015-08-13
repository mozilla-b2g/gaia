 # This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.clock.app import Clock
from gaiatest.apps.base import PageRegion



class StopWatch(Clock):
    _stopwatch_view_locator = (By.CSS_SELECTOR,'#stopwatch-panel.active')
    _stopwatch_time_locator = (By.CSS_SELECTOR, ".stopwatch-time")
    _stopwatch_start_locator = (By.CSS_SELECTOR, '#stopwatch-controls .stopwatch-start')
    _stopwatch_pause_locator = (By.CSS_SELECTOR, '#stopwatch-controls .stopwatch-pause')
    _stopwatch_reset_locator = (By.CSS_SELECTOR, '#stopwatch-controls .stopwatch-reset')
    _stopwatch_resume_locator = (By.CSS_SELECTOR, '#stopwatch-controls .stopwatch-resume')
    _stopwatch_lap_locator = (By.CSS_SELECTOR, '#stopwatch-controls .stopwatch-lap')
    _all_laps_locator = (By.CSS_SELECTOR, '.stopwatch-laps li')

    def __init__(self, marionette):
        Clock.__init__(self, marionette)
        view = self.marionette.find_element(*self._stopwatch_view_locator)
        Wait(self.marionette).until(lambda m: view.location['x'] == 0 and view.is_displayed())

    @property
    def current_time(self):
        current_time = Wait(self.marionette).until(expected.element_present(*self._stopwatch_time_locator))
        return current_time.text

    @property
    def laps(self):
        return [self.LapItem(self.marionette, lap) for lap in self.marionette.find_elements(*self._all_laps_locator)]

    def start(self):
        Wait(self.marionette).until(expected.element_present(*self._stopwatch_start_locator)).tap()

    def pause(self):
        Wait(self.marionette).until(expected.element_present(*self._stopwatch_pause_locator)).tap()

    def reset(self):
        Wait(self.marionette).until(expected.element_present(*self._stopwatch_reset_locator)).tap()

    def resume(self):
        Wait(self.marionette).until(expected.element_present(*self._stopwatch_resume_locator)).tap()

    def record_lap(self):
        Wait(self.marionette).until(expected.element_present(*self._stopwatch_lap_locator)).tap()

    class LapItem(PageRegion):
        _lap_name = (By.CSS_SELECTOR, '.lap-name')
        _lap_time = (By.CSS_SELECTOR, '.lap-duration')

        @property
        def name(self):
            return self.root_element.find_element(*self._lap_name).text

        @property
        def time(self):
            return self.root_element.find_element(*self._lap_time).text


