# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest

from gaiatest import GaiaTestCase
from gaiatest import GaiaTestEnvironment
from gaiatest.apps.email.app import Email


class TestEmailSettingsViewAccessibility(GaiaTestCase):

    def setUp(self):
        if not GaiaTestEnvironment(self.testvars).email.get('gmail'):
            raise SkipTest('Gmail account details not present in test variables.')

        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.email = Email(self.marionette)
        self.email.launch()

        # setup basic gmail account
        self.email.basic_setup_email('Gmail account',
                                     self.environment.email['gmail']['email'],
                                     self.environment.email['gmail']['password'])

    def test_a11y_email_settings_view(self):
        # Make sure message list screen is accessible.
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._message_list_locator)))

        # Open folders menu.
        toolbar = self.email.header.a11y_click_menu()
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.email._message_list_locator)))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._folder_picker_locator)))

        # Open settings
        settings = toolbar.a11y_click_settings()
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.email._folder_picker_locator)))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._settings_main_locator)))

        # Click add account
        self.accessibility.click(self.marionette.find_element(*settings._account_add_locator))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.email._settings_main_locator)))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._setup_account_info)))

        # Back to settings
        self.accessibility.click(self.marionette.find_element(*self.email._back_button_locator))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._settings_main_locator)))

        # Open account settings
        account_settings = settings.email_accounts[0].a11y_click()
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.email._settings_main_locator)))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._settings_account_locator)))

        # Delete account
        delete_confirmation = account_settings.a11y_click_delete()
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.email._settings_account_locator)))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._confirm_dialog_locator)))
        delete_confirmation.a11y_click_delete()

        # Back to setup account
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.email._confirm_dialog_locator)))
        self.assertTrue(self.accessibility.is_visible(self.marionette.find_element(
            *self.email._setup_account_info)))
