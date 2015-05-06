# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.email.app import Email


class TestSetupAndSendActiveSyncEmail(GaiaTestCase):

    def setUp(self):
        if not GaiaTestEnvironment(self.testvars).email.get('activesync'):
            raise SkipTest('ActiveSync account details not present in test variables.')

        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.email = Email(self.marionette)
        self.email.launch()

    def test_setup_and_send_active_sync_email(self):
        """
        https://moztrap.mozilla.org/manage/case/2474/
        https://moztrap.mozilla.org/manage/case/2475/
        """
        # setup ActiveSync account
        self.email.setup_active_sync_email(self.environment.email['activesync'])

        # check header area
        self.assertTrue(self.email.header.is_compose_visible)
        self.assertTrue(self.email.header.is_menu_visible)
        self.assertEqual(self.email.header.label, 'Inbox')

        # check toolbar area
        self.assertTrue(self.email.toolbar.is_edit_visible)
        self.assertTrue(self.email.toolbar.is_refresh_visible)

        # wait for sync to complete
        self.email.wait_for_emails_to_sync()

        curr_time = repr(time.time()).replace('.', '')
        _subject = 's%s' % curr_time
        _body = 'b%s' % curr_time
        new_email = self.email.header.tap_compose()

        new_email.type_to(self.environment.email['activesync']['email'])
        new_email.type_subject(_subject)
        new_email.type_body(_body)

        self.email = new_email.tap_send()

        # wait for the email to be sent before we tap refresh
        self.email.wait_for_email(_subject)

        read_email = self.email.tap_email_subject(_subject)

        self.assertEqual(_body, read_email.body)
        self.assertEqual(_subject, read_email.subject)
