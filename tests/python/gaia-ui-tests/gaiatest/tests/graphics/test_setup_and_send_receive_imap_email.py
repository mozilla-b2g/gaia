# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from marionette_driver import Wait

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.email.app import Email
from gaiatest.apps.email.app import SetupEmail


class TestSetupAndSendIMAPEmail(GaiaImageCompareTestCase):
    def setUp(self):
        if not GaiaTestEnvironment(self.testvars).email.get('imap'):
            raise SkipTest('IMAP account details not present in test variables.')
        if not GaiaTestEnvironment(self.testvars).email.get('smtp'):
            raise SkipTest('SMTP account details not present in test variables.')

        GaiaImageCompareTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.email = Email(self.marionette)
        self.email.launch()

    def test_setup_and_send_imap_email(self):
        """Verify the Appearance of email app is proper.

        Refer to:
        https://moztrap.mozilla.org/manage/case/6113/
        https://moztrap.mozilla.org/manage/case/6114/
        """
        # setup IMAP account
        self.setup_IMAP_email(self.environment.email['imap'],
                              self.environment.email['smtp'])

        # take picture of the menu
        Wait(self.marionette).until(lambda m: self.email.header.is_menu_visible)
        self.email.wait_for_emails_to_sync()
        self.email.header.tap_menu()
        self.take_screenshot()
        self.email.header.tap_menu()

        _subject = 'Testing Images'
        _body = 'The quick brown fox jumps over the lazy dog ~!@#$#%^&*)(_+ <>?,./:";[]{}\\'
        Wait(self.marionette).until(lambda m: self.email.header.is_compose_visible)
        new_email = self.email.header.tap_compose()
        self.take_screenshot()

        new_email.type_to(self.environment.email['imap']['email'])
        new_email.type_subject(_subject)
        new_email.type_body(_body)
        self.take_screenshot()

        # Commented out due to Bug 1131095
        # Exit to homescreen
        # self.device.touch_home_button()
        # self.email.launch()

        self.email = new_email.tap_send()

        # wait for the email to be sent before we tap refresh
        self.email.wait_for_email(_subject)
        self.email.wait_for_search_textbox_hidden()

        read_email = self.email.tap_email_subject(_subject)
        Wait(self.marionette, timeout = 20).until(
            lambda m: _subject == read_email.subject)

        read_email.tap_move_button()
        self.take_screenshot()
        read_email.cancel_move()

        read_email.tap_reply_button()
        self.take_screenshot()
        read_email.cancel_reply()

        # delete the message to avoid using stale message in future runs
        read_email.tap_delete_button()
        self.take_screenshot()
        read_email.approve_delete()

    # moved from SetupEmail to embed screenshot commands
    def setup_IMAP_email(self, imap, smtp):
        basic_setup = SetupEmail(self.marionette)
        basic_setup.type_name('IMAP account')
        basic_setup.type_email(imap['email'])

        setup = self.email.tap_manual_setup()
        self.take_screenshot()
        setup.select_account_type('IMAP+SMTP')

        setup.type_imap_hostname(imap['hostname'])
        setup.type_imap_name(imap['username'])
        setup.type_imap_password(imap['password'])
        setup.type_imap_port(imap['port'])

        setup.type_smtp_hostname(smtp['hostname'])
        setup.type_smtp_name(smtp['username'])
        setup.type_smtp_password(smtp['password'])
        setup.type_smtp_port(smtp['port'])
        self.take_screenshot()
        setup.tap_next()
        self.take_screenshot()
        setup.check_for_emails_interval('20000')

        setup.tap_account_prefs_next()
        self.take_screenshot()
        setup.wait_for_setup_complete()
        setup.tap_continue()
        self.email.wait_for_message_list()

