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


class TestReceiveActiveSyncEmail(GaiaTestCase):

    def setUp(self):
        email = GaiaTestEnvironment(self.testvars).email
        if not email.get('activesync'):
            raise SkipTest('ActiveSync account details not present in test variables.')
        elif not email.get('smtp'):
            raise SkipTest('SMTP account details not present in test variables.')

        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_receive_active_sync_email(self):
        # setup ActiveSync account
        email = Email(self.marionette)
        email.launch()

        email.setup_active_sync_email(
            self.environment.email['activesync'])

        # wait for sync to complete
        email.wait_for_emails_to_sync()

        # Touch home button to exit email app
        self.device.touch_home_button()

        # send email to active sync account
        mock_email = MockEmail(self.environment.host['smtp']['email'],
                               self.environment.email['activesync']['email'])
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

        # Assert there is one notification is listed in notifications-container
        notifications = utility_tray.notifications
        self.assertEqual(1, len(notifications), 'Expected one notification.')
        email = notifications[0].tap_notification()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == "E-Mail")
        self.apps.switch_to_displayed_app()

        # check if the sender's email address is fine
        self.assertEqual(email.senders_email, mock_email['from'],
                         'Senders\'s email on the inbox screen is incorrect. '
                         'Expected email is %s. Actual email is %s.' % (
                             mock_email['from'], email.senders_email))

        # check if the subject is fine
        self.assertEqual(email.subject, mock_email['subject'],
                         'Senders\'s email on the inbox scrseen is incorrect. '
                         'Expected subject is %s. Actual subject is %s.' % (
                             mock_email['subject'], email.subject))

        # check if the email message is fine
        self.assertEqual(email.body, mock_email['message'],
                         'Email message on read email screen is incorrect. '
                         'Expected message is "%s". Actual message is '
                         '"%s".' % (mock_email['message'], email.body))
