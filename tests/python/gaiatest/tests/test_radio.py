# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestRadio(GaiaTestCase):

    # Radio
    _frequency_dialer_locator = ('id', 'frequency-dialer')
    _frequency_indicator_locator = ('id', 'frequency')
    _power_button_locator = ('id', 'power-switch')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Launch the Radio application
        self.app = self.apps.launch('FM Radio')

    def test_radio(self):
        # https://moztrap.mozilla.org/manage/case/2461/

        # Access to the FM hardware radio requires the use of headphones
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # Determine if the FM hardware radio is enabled; wait for hardware init
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # Check if the radio is on
        power_button = self.marionette.find_element(*self._power_button_locator)
        self.assertEqual(power_button.get_attribute('data-enabled'), 'true')
        self.assertTrue(self.data_layer.is_fm_radio_enabled)

        frequency_indicator = self.marionette.find_element(*self._frequency_indicator_locator)
        dialer = self.marionette.find_element(*self._frequency_dialer_locator)

        # Check that the FM radio has tuned in to the default channel frequency (lower bound)
        channel = str(self.data_layer.fm_radio_frequency)

        self.assertEqual(frequency_indicator.text, channel)

        # Flick down the frequency dialer a couple times
        for station in range(0, 20):

            # Get new coordinates for realistic flinging
            dialer_x_center = int(dialer.size['width'] / 2)
            dialer_y_center = int(dialer.size['height'] / 2)

            self.marionette.flick(dialer, dialer_x_center, dialer_y_center, 0, 300, 800)

        # Check that the FM radio has tuned in to a higher default frequency (upper bound)
        self.assertNotEqual(channel, str(self.data_layer.fm_radio_frequency))
        self.assertNotEqual(frequency_indicator.text, channel)

    def tearDown(self):
        # Turn off the radio
        self.marionette.find_element(*self._power_button_locator).click()

        if self.app:
            self.apps.kill(self.app)

        GaiaTestCase.tearDown(self)
