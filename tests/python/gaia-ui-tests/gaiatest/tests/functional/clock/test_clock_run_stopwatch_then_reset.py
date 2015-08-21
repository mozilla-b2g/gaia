# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock
import time

class TestClockRunStopWatch(GaiaTestCase):


    def setUp(self):
        GaiaTestCase.setUp(self)

        self.clock = Clock(self.marionette)
        self.clock.launch()

    def test_click_run_stopwatch_then_reset(self):

        stopwatch_view = self.clock.switch_view("stopwatch")

        self.assertEqual(stopwatch_view.current_time, '00:00.00')

        stopwatch_view.tap_start()

        time.sleep(0.2)

        self.assertNotEqual(stopwatch_view.current_time, '00:00.00')

        stopwatch_view.tap_pause()

        first_time = stopwatch_view.current_time

        time.sleep(0.2)

        self.assertNotEqual(stopwatch_view.current_time, '00:00.00')

        self.assertNotEqual(first_time, stopwatch_view.current_time)

        stopwatch_view.tap_reset()

        self.assertEqual(stopwatch_view.current_time, '00:00.00')
