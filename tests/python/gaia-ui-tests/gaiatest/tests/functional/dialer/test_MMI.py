# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.phone.regions.attention_screen import AttentionScreen

IMEI_CODE = "*#06#"
CALL_FORWARDING_CODE = "*#21#"


class TestMMI(GaiaTestCase):

    def test_MMI_code_IMEI(self):

        phone = Phone(self.marionette)
        phone.launch()

        # Dial the code
        phone.keypad.dial_phone_number(IMEI_CODE)

        attention_screen = AttentionScreen(self.marionette)
        self.assertEqual(attention_screen.message, self.testvars['imei'])
