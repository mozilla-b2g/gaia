# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class SettingsForm(Base):

    _settings_view_locator = (By.ID, 'view-settings')
    _loading_overlay_locator = (By.ID, 'loading-overlay')
    _settings_close_button_locator = (By.ID, 'settings-close')
    _order_by_last_name_locator = (By.CSS_SELECTOR, 'p[data-l10n-id="contactsOrderBy"]')
    _order_by_last_name_switch_locator = (By.CSS_SELECTOR, 'input[name="order.lastname"]')
    _import_from_sim_button_locator = (By.CSS_SELECTOR, "li[id*='import-sim-option'] button")
    _import_from_sdcard_locator = (By.CSS_SELECTOR, 'button.icon-sd[data-l10n-id="importMemoryCard"]')
    _import_from_gmail_button_locator = (By.CSS_SELECTOR, 'button.icon-gmail[data-l10n-id="importGmail"]')
    _import_from_windows_live_button_locator = (By.CSS_SELECTOR, 'button.icon-live[data-l10n-id="importLive"]')
    _back_from_import_contacts_locator = (By.ID, 'import-settings-back')
    _export_to_sd_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="memoryCard"]')
    _import_contacts_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="importContactsButton"]')
    _export_contacts_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="exportContactsButton"]')
    _gmail_contacts_imported_locator = (By.CSS_SELECTOR, '.icon.icon-gmail > p > span')
    _import_settings_locator = (By.ID, 'import-settings')
    _select_contacts_locator = (By.ID, 'selectable-form')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        view = self.marionette.find_element(*self._settings_view_locator)
        self.wait_for_condition(lambda m: view.location['y'] == 0)

    def tap_order_by_last_name(self):
        self.wait_for_element_displayed(*self._order_by_last_name_locator)
        self.marionette.find_element(*self._order_by_last_name_locator).click()

    @property
    def order_by_last_name(self):
        return self.marionette.find_element(*self._order_by_last_name_switch_locator).is_selected()

    def tap_import_contacts(self):
        self.wait_for_element_displayed(*self._import_contacts_locator)
        self.marionette.find_element(*self._import_contacts_locator).tap()
        self.wait_for_condition(lambda m: m.find_element(*self._import_settings_locator).location['x'] == 0)

    def tap_export_contacts(self):
        self.wait_for_element_displayed(*self._export_contacts_locator)
        self.marionette.find_element(*self._export_contacts_locator).tap()
        self.wait_for_condition(lambda m: m.find_element(*self._import_settings_locator).location['x'] == 0)

    def tap_import_from_sim(self):
        self.wait_for_element_displayed(*self._import_from_sim_button_locator)
        self.marionette.find_element(*self._import_from_sim_button_locator).tap()
        from gaiatest.apps.contacts.app import Contacts
        self.wait_for_element_displayed(*Contacts._status_message_locator)
        self.wait_for_element_not_displayed(*Contacts._status_message_locator)

    @property
    def gmail_imported_contacts(self):
        return self.marionette.find_element(*self._gmail_contacts_imported_locator).text

    def tap_import_from_gmail(self):
        self.wait_for_element_displayed(*self._import_from_gmail_button_locator)
        self.marionette.find_element(*self._import_from_gmail_button_locator).tap()
        from gaiatest.apps.contacts.regions.gmail import GmailLogin
        return GmailLogin(self.marionette)

    def tap_import_from_sdcard(self):
        self.wait_for_element_displayed(*self._import_from_sdcard_locator)
        self.marionette.find_element(*self._import_from_sdcard_locator).tap()
        from gaiatest.apps.contacts.app import Contacts
        self.wait_for_element_displayed(*Contacts._status_message_locator)
        self.wait_for_element_not_displayed(*Contacts._status_message_locator)

    def tap_export_to_sd(self):
        self.wait_for_element_displayed(*self._export_to_sd_button_locator)
        self.marionette.find_element(*self._export_to_sd_button_locator).tap()
        self.wait_for_condition(lambda m: m.find_element(*self._select_contacts_locator).location['y'] == 0)

    def tap_done(self):
        self.marionette.find_element(*self._settings_close_button_locator).tap()
        self.wait_for_element_not_displayed(*self._settings_close_button_locator)
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    def tap_back_from_import_contacts(self):
        self.marionette.find_element(*self._back_from_import_contacts_locator).tap()
        self.wait_for_element_not_displayed(*self._back_from_import_contacts_locator)
