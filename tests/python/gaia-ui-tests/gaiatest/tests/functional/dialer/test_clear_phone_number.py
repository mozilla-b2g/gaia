# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

from gaiatest.apps.phone.app import Phone


class TestClearPhoneNumber(GaiaTestCase):

    def test_clear_phone_number(self):
        """
        https://moztrap.mozilla.org/manage/case/2191/
        """
        test_phone_number = '5551234567'

        phone = Phone(self.marionette)
        phone.launch()
        phone.keypad.dial_phone_number(test_phone_number)
        self.assertEquals(phone.keypad.phone_number, test_phone_number)
        phone.keypad.clear_phone_number()
        self.assertEquals(phone.keypad.phone_number, '')
