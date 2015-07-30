# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.email.app import Email


class TestSetupAndSendIMAPEmail(GaiaTestCase):

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

    def test_setup_and_send_imap_email(self):
        """
        https://moztrap.mozilla.org/manage/case/6113/
        https://moztrap.mozilla.org/manage/case/6114/
        """
        # setup IMAP account
        self.email.setup_IMAP_email(self.environment.email['imap'],
                                    self.environment.email['smtp'])

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

        # Bug 878772 - email app doesn't show the last emails by default
        self.email.mails[0].scroll_to_message()

        curr_time = repr(time.time()).replace('.', '')
        _subject = 's%s' % curr_time
        _body = 'b%s' % curr_time
        new_email = self.email.header.tap_compose()

        new_email.type_to(self.environment.email['imap']['email'])
        new_email.type_subject(_subject)
        new_email.type_body(_body)

        self.email = new_email.tap_send()

        # wait for the email to be sent before we tap refresh
        self.email.wait_for_email(_subject)

        # make sure the search textbox is not diplayed
        self.email.wait_for_search_textbox_hidden()

        # tap the email that has the expected subject
        read_email = self.email.tap_email_subject(_subject)

        self.assertEqual(_body, read_email.body.splitlines()[0])
        self.assertEqual(_subject, read_email.subject)
