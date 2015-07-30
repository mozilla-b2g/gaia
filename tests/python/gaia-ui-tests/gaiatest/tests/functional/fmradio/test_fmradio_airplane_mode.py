# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.fmradio.app import FmRadio


class TestFMRadioAirplaneMode(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # Disable the device radio, enable Airplane mode
        self.data_layer.set_setting('airplaneMode.enabled', True)

    def test_radio_airplane_mode(self):

        """ Set airplane mode then turn on the radio

        https://moztrap.mozilla.org/manage/case/8464/
        """
        self.fm_radio = FmRadio(self.marionette)
        self.fm_radio.launch(self.data_layer.get_setting('airplaneMode.enabled'))
        self.assertFalse(self.data_layer.is_fm_radio_enabled, 'Radio is still enabled in Airplane mode')

        # check the headphone is plugged-in or not
        self.assertTrue(self.data_layer.is_antenna_available, 'Antenna (headphones) not plugged in')

        Wait(self.marionette).until(lambda m: self.fm_radio.airplane_warning_title == 'Airplane mode is on')
        self.assertEqual(self.fm_radio.airplane_warning_text, 'Turn off Airplane mode to use FM Radio.')
