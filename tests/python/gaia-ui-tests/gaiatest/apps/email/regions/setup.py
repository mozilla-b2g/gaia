# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class SetupEmail(Base):

    _name_locator = (By.CSS_SELECTOR, 'cards-setup-account-info input.sup-info-name')
    _email_locator = (By.CSS_SELECTOR, 'cards-setup-account-info input.sup-info-email')
    _next_locator = (By.CSS_SELECTOR, '.sup-info-next-btn')
    _continue_button_locator = ('class name', 'sup-show-mail-btn sup-form-btn recommend')
    _check_for_new_messages_locator = (By.CSS_SELECTOR, '.tng-account-check-interval.mail-select')
    _account_prefs_section_locator = (By.CSS_SELECTOR, 'cards-setup-account-prefs section')
    _account_prefs_next_locator = (By.CSS_SELECTOR, 'cards-setup-account-prefs .sup-info-next-btn')
    _done_section_locator = (By.CSS_SELECTOR, 'cards-setup-done section')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._name_locator))))

    def type_name(self, value):
        self.marionette.find_element(*self._name_locator).send_keys(value)

    def type_email(self, value):
        self.marionette.find_element(*self._email_locator).send_keys(value)

    def tap_next(self):
        self.marionette.find_element(*self._next_locator).tap()

    def tap_account_prefs_next(self):
        next = Wait(self.marionette, timeout=120).until(
            expected.element_present(*self._account_prefs_next_locator))
        Wait(self.marionette, timeout=120).until(
            expected.element_displayed(next))
        next.tap()

    def wait_for_setup_complete(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._done_section_locator))
        Wait(self.marionette).until(lambda m: element.location['x'] == 0)

    def tap_continue(self):
        self.marionette.find_element(*self._continue_button_locator).tap()


class ManualSetupEmail(Base):

    name = 'E-Mail'  # hack to be able to use select

    _name_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config input.sup-info-name')
    _email_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config input.sup-info-email')
    _password_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config input.sup-info-password')

    _account_type_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-account-type')

    _imap_username_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-composite-username')
    _imap_password_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-composite-password')
    _imap_hostname_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-composite-hostname')
    _imap_port_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-composite-port')

    _smtp_username_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-smtp-username')
    _smtp_password_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-smtp-password')
    _smtp_hostname_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-smtp-hostname')
    _smtp_port_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-smtp-port')

    _activesync_hostname_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-activesync-hostname')
    _activesync_username_locator = (By.CSS_SELECTOR, 'cards-setup-manual-config .sup-manual-activesync-username')

    _next_locator = (By.CSS_SELECTOR, '.sup-manual-next-btn')
    _continue_button_locator = (By.CLASS_NAME, 'sup-show-mail-btn sup-form-btn recommend')

    _check_for_new_messages_locator = (By.CSS_SELECTOR, '.tng-account-check-interval.mail-select')
    _account_prefs_section_locator = (By.CSS_SELECTOR, 'cards-setup-account-prefs')
    _account_prefs_next_locator = (By.CSS_SELECTOR, 'cards-setup-account-prefs .sup-info-next-btn')
    _done_section_locator = (By.CSS_SELECTOR, 'cards-setup-done section')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._name_locator))))

    def type_name(self, value):
        el = self.marionette.find_element(*self._name_locator)
        el.clear()
        el.send_keys(value)
        self.keyboard.dismiss()

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
        account_type.click()
        self.marionette.switch_to_frame()
        self.select(value)

    def type_imap_name(self, value):
        el = self.marionette.find_element(*self._imap_username_locator)
        el.clear()
        el.send_keys(value)

    def type_imap_hostname(self, value):
        el = self.marionette.find_element(*self._imap_hostname_locator)
        el.clear()
        el.send_keys(value)

    def type_imap_password(self, value):
        el = self.marionette.find_element(*self._imap_password_locator)
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

    def type_smtp_password(self, value):
        el = self.marionette.find_element(*self._smtp_password_locator)
        el.clear()
        el.send_keys(value)

    def type_smtp_port(self, value):
        el = self.marionette.find_element(*self._smtp_port_locator)
        el.clear()
        el.send_keys(value)
        self.keyboard.dismiss()

    def type_activesync_name(self, value):
        el = self.marionette.find_element(*self._activesync_username_locator)
        el.clear()
        el.send_keys(value)
        self.keyboard.dismiss()

    def type_activesync_hostname(self, value):
        el = self.marionette.find_element(*self._activesync_hostname_locator)
        el.clear()
        el.send_keys(value)

    def tap_next(self):
        next = Wait(self.marionette).until(expected.element_present(*self._next_locator))
        Wait(self.marionette).until(lambda m: next.get_attribute('disabled') != 'true')
        next.tap()

        account = Wait(self.marionette).until(
            expected.element_present(*self._account_prefs_section_locator))
        Wait(self.marionette).until(lambda m: account.location['x'] == 0)

        Wait(self.marionette, timeout=120).until(expected.element_displayed(
            Wait(self.marionette, timeout=120).until(expected.element_present(
                *self._account_prefs_next_locator))))

    def check_for_emails_interval(self, value):
        # The following pref change allows us to check the mail within 1 second or longer,
        # rather than the default value of 100 seconds
        # The UI data layer of the UI is changed, because the minimum check mail time value is 5 min,
        # which is far too long to check for in a test. This allows us to check earlier
        self.marionette.execute_script("""
            SpecialPowers.setIntPref('dom.requestSync.minInterval', 1);
            document.querySelector("[data-l10n-id = settings-check-every-5min]").value = '%s';
        """ % value, special_powers=True)
        self.marionette.find_element(*self._check_for_new_messages_locator).tap()
        self.select('Every 5 minutes')

    def tap_account_prefs_next(self):
        self.marionette.find_element(*self._account_prefs_next_locator).tap()

    def wait_for_setup_complete(self):
        done = Wait(self.marionette).until(
            expected.element_present(*self._done_section_locator))
        Wait(self.marionette).until(lambda m: done.location['x'] == 0)

    def tap_continue(self):
        self.marionette.find_element(*self._continue_button_locator).tap()
