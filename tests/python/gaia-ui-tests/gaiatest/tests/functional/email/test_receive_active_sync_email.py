# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest.apps.email.app import Email
from gaiatest.mocks.mock_email import MockEmail
from gaiatest.utils.email.email_util import EmailUtil


class TestReceiveActiveSyncEmail(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['email']['ActiveSync']
            self.testvars['email']['IMAP']
        except KeyError:
            raise SkipTest('account details not present in test variables')

        GaiaTestCase.setUp(self)
        self.connect_to_network()

    def test_receive_active_sync_email(self):
        # setup ActiveSync account
        email = Email(self.marionette)
        email.launch()

        email.setup_active_sync_email(
            self.testvars['email']['ActiveSync'])

        # wait for sync to complete
        email.wait_for_emails_to_sync()

        # send email to active sync account
        mock_email = MockEmail(senders_email=self.testvars['email']['IMAP']['email'],
                               recipients_email=self.testvars['email']['ActiveSync']['email'])
        EmailUtil().send(self.testvars['email']['IMAP'], mock_email)

        # wait for the email to arrive
        email.wait_for_email(mock_email.subject)

        # check if the sender's email address is fine
        self.assertEqual(email.mails[0].senders_email,
                         mock_email.senders_email,
                         'Senders\'s email on the inbox screen is incorrect. '
                         'Expected email is %s. Actual email is %s.' % (
                             mock_email.senders_email,
                             email.mails[0].senders_email))

        # check if the subject is fine
        self.assertEqual(email.mails[0].subject, mock_email.subject,
                         'Senders\'s email on the inbox scrseen is incorrect. '
                         'Expected subject is %s. Actual subject is %s.' % (
                             mock_email.subject, email.mails[0].subject))

        # open the email to read it
        email = email.mails[0].tap_subject()

        # check if the sender's email address is fine
        self.assertEqual(email.senders_email,
                         mock_email.senders_email,
                         'Senders\'s email on the inbox screen is incorrect. '
                         'Expected email is %s. Actual email is %s.' % (
                             mock_email.senders_email,
                             email.senders_email))

        # check if the subject is fine
        self.assertEqual(email.subject, mock_email.subject,
                         'Senders\'s email on the inbox scrseen is incorrect. '
                         'Expected subject is %s. Actual subject is %s.' % (
                             mock_email.subject, email.subject))

        # check if the email message is fine
        self.assertEqual(email.body, mock_email.message,
                         'Email message on read email screen is incorrect. '
                         'Expected message is "%s". Actual message is '
                         '"%s".' % (mock_email.message,
                                    email.body))
