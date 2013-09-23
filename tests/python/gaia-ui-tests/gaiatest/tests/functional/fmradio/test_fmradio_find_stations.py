# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.fmradio.app import FmRadio


class TestFMRadioFindStations(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the FM Radio app
        self.fm_radio = FmRadio(self.marionette)
        self.fm_radio.launch()

    def test_find_next_station(self):
        """ Find next station

        https://moztrap.mozilla.org/manage/case/1928/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # save the current frequency
        initial_frequency = self.fm_radio.frequency

        # search next station
        self.fm_radio.tap_next()

        # check the ui value and the system value
        self.assertEqual(self.fm_radio.frequency, float(self.data_layer.fm_radio_frequency))

        # check the change of the frequency
        self.assertNotEqual(initial_frequency, self.fm_radio.frequency)

    def test_find_prev_station(self):
        """ Find previous station

        https://moztrap.mozilla.org/manage/case/1929/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # save the current frequency
        current_frequency = self.fm_radio.frequency

        # check the ui value and the system value
        self.assertEqual(current_frequency, float(self.data_layer.fm_radio_frequency))

        # search prev station
        self.fm_radio.tap_previous()

        # check the ui value and the system value
        self.assertEqual(self.fm_radio.frequency, float(self.data_layer.fm_radio_frequency))

        # check the change of the frequency
        self.assertNotEqual(current_frequency, self.fm_radio.frequency)
