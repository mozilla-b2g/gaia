# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class SetupEmail(Base):

    _name_locator = (By.CSS_SELECTOR, 'section.card-setup-account-info input.sup-info-name')
    _email_locator = (By.CSS_SELECTOR, 'section.card-setup-account-info input.sup-info-email')
    _password_locator = (By.CSS_SELECTOR, 'section.card-setup-account-info input.sup-info-password')
    _next_locator = (By.CSS_SELECTOR, '.sup-info-next-btn')
    _continue_button_locator = ('class name', 'sup-show-mail-btn sup-form-btn recommend')
    _check_for_new_messages_locator = (By.CSS_SELECTOR, '.tng-account-check-interval.mail-select')
    _account_prefs_next_locator = (By.CSS_SELECTOR, '.card-setup-account-prefs .sup-info-next-btn')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._name_locator)

    def type_name(self, value):
        self.marionette.find_element(*self._name_locator).send_keys(value)

    def type_email(self, value):
        self.marionette.find_element(*self._email_locator).send_keys(value)

    def type_password(self, value):
        self.marionette.find_element(*self._password_locator).send_keys(value)

    def tap_next(self):
        # TODO Tap one pixel above bottom edge to dodge the System update notification banner bug 879192
        next_button = self.marionette.find_element(*self._next_locator)
        next_button.tap(y=(next_button.size['height'] - 1))
        self.wait_for_element_displayed(*self._check_for_new_messages_locator)

    def tap_account_prefs_next(self):
        self.marionette.find_element(*self._account_prefs_next_locator).tap()

    def wait_for_setup_complete(self):
        self.wait_for_element_displayed(*self._continue_button_locator)

    def tap_continue(self):
        self.marionette.find_element(*self._continue_button_locator).tap()


class ManualSetupEmail(Base):

    name = 'E-Mail'  # hack to be able to use select

    _name_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config input.sup-info-name')
    _email_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config input.sup-info-email')
    _password_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config input.sup-info-password')

    _account_type_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-account-type')

    _imap_username_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-composite-username')
    _imap_hostname_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-composite-hostname')
    _imap_port_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-composite-port')

    _smtp_username_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-smtp-username')
    _smtp_hostname_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-smtp-hostname')
    _smtp_port_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-smtp-port')

    _activesync_hostname_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-activesync-hostname')
    _activesync_username_locator = (By.CSS_SELECTOR, 'section.card-setup-manual-config .sup-manual-activesync-username')

    _next_locator = (By.CSS_SELECTOR, '.sup-manual-next-btn')
    _continue_button_locator = (By.CLASS_NAME, 'sup-show-mail-btn sup-form-btn recommend')

    _check_for_new_messages_locator = (By.CSS_SELECTOR, '.tng-account-check-interval.mail-select')
    _account_prefs_next_locator = (By.CSS_SELECTOR, '.card-setup-account-prefs .sup-info-next-btn')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._name_locator)

    def type_name(self, value):
        el = self.marionette.find_element(*self._name_locator)
        el.clear()
        el.send_keys(value)

    def type_email(self, value):
        el = self.marionette.find_element(*self._email_locator)
        el.clear()
        el.send_keys(value)
        self.keyboard.dismiss()

    def type_password(self, value):
        el = self.marionette.find_element(*self._password_locator)
        el.clear()
        el.send_keys(value)
        self.keyboard.dismiss()

    def select_account_type(self, value):
        account_type = self.marionette.find_element(*self._account_type_locator)
        # TODO: remove the explicit scroll once bug 833370 is fixed
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [account_type])
        account_type.click()
        self.select(value)

    def type_imap_name(self, value):
        el = self.marionette.find_element(*self._imap_username_locator)
        el.clear()
        el.send_keys(value)

    def type_imap_hostname(self, value):
        el = self.marionette.find_element(*self._imap_hostname_locator)
        el.clear()
        el.send_keys(value)

    def type_imap_port(self, value):
        el = self.marionette.find_element(*self._imap_port_locator)
        el.clear()
        el.send_keys(value)

    def type_smtp_name(self, value):
        el = self.marionette.find_element(*self._smtp_username_locator)
        el.clear()
        el.send_keys(value)

    def type_smtp_hostname(self, value):
        el = self.marionette.find_element(*self._smtp_hostname_locator)
        el.clear()
        el.send_keys(value)

    def type_smtp_port(self, value):
        el = self.marionette.find_element(*self._smtp_port_locator)
        el.clear()
        el.send_keys(value)

    def type_activesync_name(self, value):
        el = self.marionette.find_element(*self._activesync_username_locator)
        el.clear()
        el.send_keys(value)

    def type_activesync_hostname(self, value):
        el = self.marionette.find_element(*self._activesync_hostname_locator)
        el.clear()
        el.send_keys(value)

    def type_activesync_port(self, value):
        el = self.marionette.find_element(*self._activesync_port_locator)
        el.clear()
        el.send_keys(value)

    def tap_next(self):
        self.marionette.find_element(*self._next_locator).tap()
        self.wait_for_element_displayed(*self._check_for_new_messages_locator)

    def tap_account_prefs_next(self):
        self.wait_for_element_displayed(*self._account_prefs_next_locator)
        self.marionette.find_element(*self._account_prefs_next_locator).tap()

    def wait_for_setup_complete(self):
        self.wait_for_element_displayed(*self._continue_button_locator)

    def tap_continue(self):
        self.marionette.find_element(*self._continue_button_locator).tap()
