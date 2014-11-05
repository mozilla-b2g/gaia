# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.phone.app import Phone


class TestAccessibilityCallscreenOverlayVisibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.contact = MockContact()

        self.phone = Phone(self.marionette)
        self.phone.launch()

    def test_a11y_callscreen_overlay_visibility(self):

        test_phone_number = self.contact['tel']['value']

        # Make a call
        self.phone.a11y_make_call(test_phone_number)

        # Check that the bluetooth dialog overlay is hidden
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.phone.call_screen._bluetooth_menu_locator)))

        # Hang up
        self.phone.a11y_hang_up()
