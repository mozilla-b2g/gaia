# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from marionette_driver import Wait

from gaiatest import GaiaTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.email.app import Email
from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.apps.homescreen.app import Homescreen


class TestOnlyOneHeaderDisplayed(GaiaTestCase):

    def setUp(self):
        email = GaiaTestEnvironment(self.testvars).email
        if not email.get('imap'):
            raise SkipTest('IMAP account details not present in test variables.')
        elif not email.get('smtp'):
            raise SkipTest('SMTP account details not present in test variables.')

        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.email = Email(self.marionette)
        self.email.launch()

    def test_only_one_header_displayed(self):
        """ https://bugzilla.mozilla.org/show_bug.cgi?id=1116087 """

        self.email.setup_IMAP_email(self.environment.email['imap'],
                                    self.environment.email['smtp'])
        self.email.wait_for_emails_to_sync()
        self.assertGreater(len(self.email.mails), 0)

        email_header_list = self.marionette.find_elements(*self.email.emails_list_header_locator)
        self.assertEqual(len(email_header_list), 1, 'Should have only 1 list-header')

        self.device.hold_home_button()
        cards_view = CardsView(self.marionette)
        cards_view.wait_for_cards_view()
        cards_view.wait_for_card_ready(self.email.name)
        cards_view.close_app(self.email.name)

        self.assertFalse(cards_view.is_app_displayed(self.email.name),
                             '%s app should not be present in cards view' % self.email.name)
        self.assertEqual(len(cards_view.cards), 0, 'Should have no cards left to display')
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == Homescreen.name)

        self.email.launch()
        self.email.wait_for_emails_to_sync()
        self.assertGreater(len(self.email.mails), 0)

        email_header_list = self.marionette.find_elements(*self.email.emails_list_header_locator)
        self.assertEqual(len(email_header_list), 1, 'Should have only 1 list-header')
