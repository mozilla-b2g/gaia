# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
from gaiatest.apps.email.regions.setup import SetupEmail
from gaiatest.apps.email.regions.setup import ManualSetupEmail
from gaiatest.apps.email.regions.settings import Settings
from gaiatest.apps.email.regions.google import GoogleLogin


class Email(Base):

    name = 'E-Mail'

    _email_locator = (By.CSS_SELECTOR, '#cardContainer .msg-header-item:not([data-index="-1"])')
    _syncing_locator = (By.CSS_SELECTOR, '#cardContainer .msg-messages-syncing > .small')
    _manual_setup_locator = (By.CSS_SELECTOR, '#cardContainer .sup-manual-config-btn')
    _message_list_locator = (By.CSS_SELECTOR, 'cards-message-list')
    _setup_account_info = (By.TAG_NAME, 'cards-setup-account-info')
    _setup_manual_config = (By.TAG_NAME, 'cards-setup-manual-config')
    _folder_picker_locator = (By.TAG_NAME, 'cards-folder-picker')
    _settings_main_locator = (By.TAG_NAME, 'cards-settings-main')
    _settings_account_locator = (By.TAG_NAME, 'cards-settings-account')
    _confirm_dialog_locator = (By.TAG_NAME, 'cards-confirm-dialog')
    _refresh_button_locator = (By.CLASS_NAME, 'msg-refresh-btn')
    _search_textbox_locator = (By.CSS_SELECTOR, 'form[role="search"]')
    _email_subject_locator = (By.XPATH, '//a[@data-index!="-1"]/div/span[text()="%s"]')
    _back_button_locator = (By.CLASS_NAME, 'sup-back-btn')
    emails_list_header_locator = (By.CSS_SELECTOR, '.msg-list-header')

    def basic_setup_email(self, name, email, password):

        setup = SetupEmail(self.marionette)
        setup.type_name(name)
        setup.type_email(email)

        setup.tap_next()

        google_login = GoogleLogin(self.marionette)

        # check if the google autocomplete on email field works as expected
        assert google_login.email == email

        # dismiss the keyboard and return to the correct frame
        google_login.keyboard.dismiss()
        google_login.switch_to_frame()

        google_login.tap_next()
        google_login.type_password(password)
        google_login.tap_sign_in()

        # approve access to your account
        google_login.wait_for_approve_access()
        google_login.tap_approve_access()

        self.apps.switch_to_displayed_app()

        setup.tap_account_prefs_next()

        setup.wait_for_setup_complete()

        setup.tap_continue()
        self.wait_for_message_list()

    def setup_IMAP_email(self, imap, smtp):
        basic_setup = SetupEmail(self.marionette)
        basic_setup.type_name('IMAP account')
        basic_setup.type_email(imap['email'])

        setup = self.tap_manual_setup()

        setup.select_account_type('IMAP+SMTP')

        setup.type_imap_hostname(imap['hostname'])
        setup.type_imap_name(imap['username'])
        setup.type_imap_password(imap['password'])
        setup.type_imap_port(imap['port'])

        setup.type_smtp_hostname(smtp['hostname'])
        setup.type_smtp_name(smtp['username'])
        setup.type_smtp_password(smtp['password'])
        setup.type_smtp_port(smtp['port'])

        setup.tap_next()
        setup.check_for_emails_interval('20000')

        setup.tap_account_prefs_next()

        setup.wait_for_setup_complete()
        setup.tap_continue()
        self.wait_for_message_list()

    def setup_active_sync_email(self, active_sync):
        basic_setup = SetupEmail(self.marionette)
        basic_setup.type_name('ActiveSync account')
        basic_setup.type_email(active_sync['email'])

        setup = self.tap_manual_setup()

        setup.select_account_type('ActiveSync')

        setup.type_password(active_sync['password'])
        setup.type_activesync_hostname(active_sync['hostname'])
        setup.type_activesync_name(active_sync['username'])

        setup.tap_next()

        setup.check_for_emails_interval('20000')
        setup.tap_account_prefs_next()

        setup.wait_for_setup_complete()
        setup.tap_continue()
        self.wait_for_message_list()

    def delete_email_account(self, index):

        toolbar = self.header.tap_menu()
        toolbar.tap_settings()
        settings = Settings(self.marionette)
        account_settings = settings.email_accounts[index].tap()
        delete_confirmation = account_settings.tap_delete()
        delete_confirmation.tap_delete()

    def tap_manual_setup(self):
        manual_setup = Wait(self.marionette).until(
            expected.element_present(*self._manual_setup_locator))
        Wait(self.marionette).until(expected.element_displayed(manual_setup))
        manual_setup.tap()
        return ManualSetupEmail(self.marionette)

    def a11y_click_manual_setup(self):
        manual_setup = Wait(self.marionette).until(
            expected.element_present(*self._manual_setup_locator))
        Wait(self.marionette).until(expected.element_displayed(manual_setup))
        self.accessibility.click(manual_setup)
        return ManualSetupEmail(self.marionette)

    def a11y_navigate_to_manual_setup(self, name, email):
        setup = SetupEmail(self.marionette)
        setup.type_name(name)
        setup.type_email(email)
        setup = self.a11y_click_manual_setup()

    @property
    def header(self):
        return Header(self.marionette, self.marionette.find_element(*self.emails_list_header_locator))

    @property
    def toolbar(self):
        return ToolBar(self.marionette)

    @property
    def mails(self):
        return [Message(self.marionette, mail) for mail in self.marionette.find_elements(*self._email_locator)]

    def wait_for_emails_to_sync(self):
        element = self.marionette.find_element(*self._refresh_button_locator)
        Wait(self.marionette, timeout=60).until(
            lambda m: element.get_attribute(
                'data-state') == 'synchronized')

    def wait_for_message_list(self):
        element = self.marionette.find_element(*self._message_list_locator)
        Wait(self.marionette).until(
            lambda m: element.is_displayed() and
            element.location['x'] == 0)

    def wait_for_search_textbox_hidden(self):
        self.wait_for_element_not_displayed(*self._search_textbox_locator)

    def tap_email_subject(self, subject):
        subject_locator = (
            self._email_subject_locator[0],
            self._email_subject_locator[1] % subject
        )
        self.marionette.find_element(*subject_locator).tap()
        from gaiatest.apps.email.regions.read_email import ReadEmail
        return ReadEmail(self.marionette)

    def wait_for_email(self, subject, timeout=120):
        Wait(self.marionette, timeout, interval=5).until(
            self.email_exists(self, subject))

    class email_exists(object):

        def __init__(self, app, subject):
            self.app = app
            self.subject = subject

        def __call__(self, marionette):
            if self.subject in [mail.subject for mail in self.app.mails]:
                return True
            else:
                self.app.toolbar.tap_refresh()
                self.app.wait_for_emails_to_sync()
                self.app.mails[0].scroll_to_message()
                return False


class Header(PageRegion):

    _menu_button_locator = (By.CSS_SELECTOR, '.msg-folder-list-btn')
    _compose_button_locator = (By.CSS_SELECTOR, '.msg-compose-btn')
    _label_locator = (By.CSS_SELECTOR, '.msg-list-header-folder-label.header-label')

    def a11y_click_menu(self):
        self.accessibility.click(self.root_element.find_element(*self._menu_button_locator))
        toolbar = ToolBar(self.marionette)
        Wait(self.marionette).until(lambda m: toolbar.is_a11y_visible)
        return toolbar

    def tap_menu(self):
        self.root_element.find_element(*self._menu_button_locator).tap()
        toolbar = ToolBar(self.marionette)
        Wait(self.marionette).until(lambda m: toolbar.is_visible)
        return toolbar

    def tap_compose(self):
        self.root_element.find_element(*self._compose_button_locator).tap()
        from gaiatest.apps.email.regions.new_email import NewEmail
        return NewEmail(self.marionette)

    @property
    def label(self):
        return self.root_element.find_element(*self._label_locator).text

    @property
    def is_menu_visible(self):
        return self.is_element_displayed(*self._menu_button_locator)

    @property
    def is_compose_visible(self):
        return self.is_element_displayed(*self._compose_button_locator)


class ToolBar(Base):
    _toolbar_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .fld-nav-toolbar')
    _refresh_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .msg-refresh-btn')
    _search_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .msg-search-btn')
    _edit_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .msg-edit-btn')
    _settings_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .fld-nav-settings-btn')
    _settings_a11y_locator = (By.CSS_SELECTOR,
                              '#cardContainer .card.center .fld-nav-toolbar.bottom-toolbar')

    def tap_refresh(self):
        refresh = Wait(self.marionette).until(
            expected.element_present(*self._refresh_locator))
        Wait(self.marionette).until(expected.element_displayed(refresh))
        refresh.tap()

    def tap_search(self):
        search = Wait(self.marionette).until(
            expected.element_present(*self._search_locator))
        Wait(self.marionette).until(expected.element_displayed(search))
        search.tap()

    def tap_edit(self):
        edit = Wait(self.marionette).until(
            expected.element_present(*self._edit_locator))
        Wait(self.marionette).until(expected.element_displayed(edit))
        edit.tap()

    def a11y_click_settings(self):
        settings = Wait(self.marionette).until(
            expected.element_present(*self._settings_a11y_locator))
        Wait(self.marionette).until(lambda m: self.accessibility.is_visible(settings))
        self.accessibility.click(settings)
        return Settings(self.marionette)

    def tap_settings(self):
        settings = Wait(self.marionette).until(
            expected.element_present(*self._settings_locator))
        Wait(self.marionette).until(expected.element_displayed(settings))
        settings.tap()

    @property
    def is_visible(self):
        return self.marionette.find_element(*self._toolbar_locator).location['x'] == 0

    @property
    def is_a11y_visible(self):
        return self.accessibility.is_visible(self.marionette.find_element(*self._toolbar_locator))

    @property
    def is_refresh_visible(self):
        return self.is_element_displayed(*self._refresh_locator)

    @property
    def is_search_visible(self):
        return self.is_element_displayed(*self._search_locator)

    @property
    def is_edit_visible(self):
        return self.is_element_displayed(*self._edit_locator)

    @property
    def is_settings_visible(self):
        return self.is_element_displayed(*self._settings_locator)


class Message(PageRegion):
    _subject_locator = (By.CSS_SELECTOR, '.msg-header-subject')
    _senders_email_locator = (By.CSS_SELECTOR, '.msg-header-author')

    @property
    def subject(self):
        return self.root_element.find_element(*self._subject_locator).text

    @property
    def senders_email(self):
        return self.root_element.find_element(*self._senders_email_locator).text

    def scroll_to_message(self):
        self.marionette.execute_script("arguments[0].scrollIntoView(false);", [self.root_element])
