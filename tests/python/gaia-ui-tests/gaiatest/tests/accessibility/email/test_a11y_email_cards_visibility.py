# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.email.app import Email
from marionette_driver import Wait


class TestEmailCardsVisibilityAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.email = Email(self.marionette)
        self.email.launch()

    def test_a11y_email_cards_visibility(self):

        # Setup account info is visible
        Wait(self.marionette).until(lambda m: self.accessibility.is_visible(m.find_element(
                                    *self.email._setup_account_info)))

        # start setting up account and enter manual setup
        self.email.a11y_navigate_to_manual_setup('test_name', 'test@email.com')

        # Setup account info is now hidden
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.email._setup_account_info)))
        # Manual setup is now visible
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._setup_manual_config)))
