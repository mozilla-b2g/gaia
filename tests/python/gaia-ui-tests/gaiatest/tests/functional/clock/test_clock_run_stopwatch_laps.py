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

        stopwatch_view = self.clock.switch_view("stopwatch")

        self.assertEqual(stopwatch_view.current_time, '00:00.00')

        stopwatch_view.start()

        self.assertNotEqual(stopwatch_view.current_time, '00:00.00')

        stopwatch_view.record_lap()

        self.assertEqual(len(stopwatch_view.laps), 2)
        self.assertNotEqual(stopwatch_view.laps[0].time, '00:00.00')
        self.assertNotEqual(stopwatch_view.laps[1].time, '00:00.00')

        stopwatch_view.pause()
        recorded_time = stopwatch_view.current_time

        stopwatch_view.resume()
        self.assertNotEqual(stopwatch_view.current_time, recorded_time)

        stopwatch_view.pause()
        stopwatch_view.reset()

        self.assertEqual(len(stopwatch_view.laps), 0)
        self.assertEqual(stopwatch_view.current_time, '00:00.00')


