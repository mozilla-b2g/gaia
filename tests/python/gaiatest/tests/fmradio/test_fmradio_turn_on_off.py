# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestFMRadioTurnOnOff(GaiaTestCase):

    _power_button_locator = ('id', 'power-switch')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the FM Radio app
        self.app = self.apps.launch('FM Radio')

    def test_turn_radio_on_off(self):
        """ Turn off and then Turn on the radio

        https://moztrap.mozilla.org/manage/case/1930/
        https://moztrap.mozilla.org/manage/case/1931/

        """
        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        # wait for the radio start-up
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # turn the radio off
        power_button = self.marionette.find_element(*self._power_button_locator)
        self.marionette.tap(power_button)

        # check the radio is off
        self.wait_for_condition(lambda m: power_button.get_attribute('data-enabled') == 'false')
        self.assertFalse(self.data_layer.is_fm_radio_enabled)

        # turn the radio on
        self.marionette.tap(power_button)
        self.wait_for_condition(lambda m: self.data_layer.is_fm_radio_enabled)

        # check the radio is on
        self.assertEqual(power_button.get_attribute('data-enabled'), 'true')
        self.assertTrue(self.data_layer.is_fm_radio_enabled)

    def tearDown(self):
        # turn off the radio
        power_button = self.marionette.find_element(*self._power_button_locator)
        self.marionette.tap(power_button)

        # close the app
        if self.app:
            self.apps.kill(self.app)

        GaiaTestCase.tearDown(self)
