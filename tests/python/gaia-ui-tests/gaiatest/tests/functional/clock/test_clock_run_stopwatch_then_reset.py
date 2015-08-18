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

    def test_click_run_stopwatch_then_reset(self):

        stopwatch_view = self.clock.switch_view("stopwatch")

        self.assertEqual(stopwatch_view.current_time, '00:00.00')

        stopwatch_view.tap_start()

        self.assertNotEqual(stopwatch_view.current_time, '00:00.00')

        stopwatch_view.tap_pause()

        self.assertNotEqual(stopwatch_view.current_time, '00:00.00')
        self.assertTrue(stopwatch_view.verify_laps_not_same())

        stopwatch_view.tap_reset()

        self.assertEqual(stopwatch_view.current_time, '00:00.00')
