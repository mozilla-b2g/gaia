# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock

class TestClockRunStopWatch(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_click_run_stopwatch_laps(self):

        # Switch to the stopwatch view.
        stopwatch_view = self.clock.switch_view("stopwatch")

        # Verify that the stopwatch time is at 0.
        assert stopwatch_view.current_time == '00:00.00'

        # Start the stopwatch
        stopwatch_view.start_stopwatch()

        # Verify that the stopwatch time has started moving
        assert stopwatch_view.current_time != '00:00.00'

        # Log a lap
        stopwatch_view.record_lap()

        # Verify that there are now two laps, the one that was recorded
        # and a second lap that is running
        assert len(stopwatch_view.laps) == 2
        assert stopwatch_view.laps[0].time != '00:00.00'
        assert stopwatch_view.laps[1].time != '00:00.00'

        # Pause the stopwatch and then record the current time
        stopwatch_view.pause_stopwatch()
        recorded_time = stopwatch_view.current_time

        # Resume the stopwatch and make sure the time has started again.
        stopwatch_view.resume_stopwatch()
        assert stopwatch_view.current_time != recorded_time

        # Pause then Reset the stopwatch, make sure laps are gone and time is back to 0.
        stopwatch_view.pause_stopwatch()
        stopwatch_view.reset_stopwatch()

        assert len(stopwatch_view.laps) == 0
        assert stopwatch_view.current_time == '00:00.00'


