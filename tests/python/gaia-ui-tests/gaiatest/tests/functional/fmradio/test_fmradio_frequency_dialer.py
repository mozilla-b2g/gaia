# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.fmradio.app import FmRadio


class TestFMRadioFreqDialer(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the FM Radio app
        self.fm_radio = FmRadio(self.marionette)
        self.fm_radio.launch()

    def test_radio_frequency_dialer(self):
        # https://moztrap.mozilla.org/manage/case/2461/

        # Access to the FM hardware radio requires the use of headphones
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # Determine if the FM hardware radio is enabled; wait for hardware init
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # Check that the FM radio has tuned in to the default channel frequency (lower bound)
        channel = self.data_layer.fm_radio_frequency

        self.assertEqual(self.fm_radio.frequency, channel)

        # Flick up the frequency dialer a few times
        for station in range(0, 5):
            # Get new coordinates for realistic flinging
            self.fm_radio.flick_frequency_dialer_up()

        # Check that the FM radio has tuned in to a higher default frequency (upper bound)
        self.assertNotEqual(channel, str(self.data_layer.fm_radio_frequency))
        self.assertNotEqual(self.fm_radio.frequency, channel)
