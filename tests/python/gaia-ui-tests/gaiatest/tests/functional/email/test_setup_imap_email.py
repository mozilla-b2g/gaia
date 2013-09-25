# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest.apps.email.app import Email


class TestSetupManualEmail(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['email']['IMAP']
        except KeyError:
            raise SkipTest('account details not present in test variables')

        GaiaTestCase.setUp(self)
        self.connect_to_network()

        self.email = Email(self.marionette)
        self.email.launch()

    def test_setup_imap_email(self):
        # setup IMAP account
        self.email.setup_IMAP_email(self.testvars['email']['IMAP'])

        # check header area
        self.assertTrue(self.email.header.is_compose_visible)
        self.assertTrue(self.email.header.is_menu_visible)
        self.assertEqual(self.email.header.label, 'Inbox')

        # check toolbar area
        self.assertTrue(self.email.toolbar.is_edit_visible)
        self.assertTrue(self.email.toolbar.is_refresh_visible)

        # check account has emails
        self.email.wait_for_emails_to_sync()
        self.assertGreater(len(self.email.mails), 0)
