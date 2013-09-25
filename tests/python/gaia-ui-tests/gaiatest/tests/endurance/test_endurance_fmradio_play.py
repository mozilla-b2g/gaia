# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 62 minutes

import time

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.fmradio.app import FmRadio


class TestEnduranceFMRadioPlay(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # launch the FM Radio app
        self.fm_radio = FmRadio(self.marionette)
        self.fm_radio.launch()

        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # stay on initial station for a few seconds
        time.sleep(5)

    def test_endurance_fmradio_play(self):
        self.drive(test=self.fmradio_play, app='fm_radio')

    def fmradio_play(self):
        # Code taken from WebQA's existing FM radio tests (thanks!)

        # ensure radio is still enabled
        self.assertTrue(self.fm_radio.is_power_button_on, "FM radio should still be playing")

        # save the current frequency
        initial_frequency = self.fm_radio.frequency

        # go to next station
        self.fm_radio.tap_next()

        # check the change of the frequency
        self.assertNotEqual(initial_frequency, self.fm_radio.frequency)

        # Stay on new station for awhile; 33 seconds for 100 iterations; with checkpoints
        # every 10 iterations (radio plays during checkpoints) = 60 minutes of radio play
        time.sleep(33)
