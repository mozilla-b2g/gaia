# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestFMRadioFindStations(GaiaTestCase):

    _frequency_display_locator = ('id', 'frequency')
    _next_button_locator = ('id', 'frequency-op-seekup')
    _prev_button_locator = ('id', 'frequency-op-seekdown')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the FM Radio app
        self.app = self.apps.launch('FM Radio')

    def test_find_next_station(self):
        """ Find next station

        https://moztrap.mozilla.org/manage/case/1928/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # save the current frequency
        current_frequency = self.marionette.find_element(*self._frequency_display_locator).text

        # check the ui value and the system value
        self.assertEqual(current_frequency, str(self.data_layer.fm_radio_frequency))

        # search next station
        next_button = self.marionette.find_element(*self._next_button_locator)
        self.marionette.tap(next_button)

        self.wait_for_condition(lambda m: m.find_element(*self._frequency_display_locator).text != current_frequency)

        next_frequency = self.marionette.find_element(*self._frequency_display_locator).text

        # check the ui value and the system value
        self.assertEqual(next_frequency, str(self.data_layer.fm_radio_frequency))

        # check the change of the frequency
        self.assertNotEqual(current_frequency, next_frequency)

    def test_find_prev_station(self):
        """ Find previous station

        https://moztrap.mozilla.org/manage/case/1929/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # save the current frequency
        current_frequency = self.marionette.find_element(*self._frequency_display_locator).text

        # check the ui value and the system value
        self.assertEqual(current_frequency, str(self.data_layer.fm_radio_frequency))

        # search next station
        prev_button = self.marionette.find_element(*self._prev_button_locator)
        self.marionette.tap(prev_button)

        self.wait_for_condition(lambda m: m.find_element(*self._frequency_display_locator).text != current_frequency)
        prev_frequency = self.marionette.find_element(*self._frequency_display_locator).text

        # check the ui value and the system value
        self.assertEqual(prev_frequency, str(self.data_layer.fm_radio_frequency))

        # check the change of the frequency
        self.assertNotEqual(current_frequency, prev_frequency)
