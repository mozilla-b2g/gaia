# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.email.app import Email
from gaiatest.mocks.mock_email import MockEmail
from gaiatest.utils.email.email_util import EmailUtil
from gaiatest.apps.system.app import System


class TestEmailNotification(GaiaTestCase):

    def setUp(self):
        email = GaiaTestEnvironment(self.testvars).email
        if not email.get('imap'):
            raise SkipTest('IMAP account details not present in test variables.')
        elif not email.get('smtp'):
            raise SkipTest('SMTP account details not present in test variables.')

        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        # Open email app
        self.email = Email(self.marionette)
        self.email.launch()

    def test_IMAP_email_notification(self):
        """ https://moztrap.mozilla.org/manage/case/10744/"""
        # setup email account
        self.email.setup_IMAP_email(self.environment.email['imap'],
                                    self.environment.email['smtp'])

        # check account has emails
        self.email.wait_for_emails_to_sync()
        self.assertGreater(len(self.email.mails), 0)

        # Touch home button to exit email app
        self.device.touch_home_button()

        # send email to IMAP account
        mock_email = MockEmail(self.environment.host['smtp']['email'],
                               self.environment.email['imap']['email'])
        EmailUtil().send(self.environment.host['smtp'], mock_email)

        self.marionette.switch_to_frame()
        system = System(self.marionette)

        # Wait for email notification
        system.wait_for_notification_toaster_displayed(timeout=60)
        system.wait_for_notification_toaster_not_displayed()

        # Expand the notification bar
        system.wait_for_status_bar_displayed()
        utility_tray = system.open_utility_tray()
        utility_tray.wait_for_notification_container_displayed()

        # Assert there is one notification and is listed in notifications-container
        notifications = utility_tray.notifications
        self.assertEqual(1, len(notifications), 'Expected one notification.')
        email = notifications[0].tap_notification()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.email.name)
        self.apps.switch_to_displayed_app()

        # Wait for senders email to be shown
        email.wait_for_senders_email_displayed()

        # check if the sender's email address is fine
        self.assertEqual(email.senders_email, mock_email['from'],
                         'Senders\'s email on the inbox screen is incorrect. '
                         'Expected email is %s. Actual email is %s.' % (
                             mock_email['from'], email.senders_email))

        # check if the subject is fine
        self.assertEqual(email.subject, mock_email['subject'],
                         'Senders\'s email on the inbox screen is incorrect. '
                         'Expected subject is %s. Actual subject is %s.' % (
                             mock_email['subject'], email.subject))

        # check if the email message is fine
        self.assertEqual(email.body, mock_email['message'],
                         'Email message on read email screen is incorrect. '
                         'Expected message is "%s". Actual message is '
                         '"%s".' % (mock_email['message'], email.body))

    def tearDown(self):
        with self.marionette.using_context('chrome'):
            self.marionette.execute_script("Services.prefs.setIntPref('dom.requestSync.minInterval', 100);")
        GaiaTestCase.tearDown(self)
