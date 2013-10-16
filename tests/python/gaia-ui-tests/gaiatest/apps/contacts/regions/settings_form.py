# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class SettingsForm(Base):

    _loading_overlay_locator = (By.ID, 'loading-overlay')
    _settings_close_button_locator = (By.ID, 'settings-close')
    _order_by_last_name_locator = (By.CSS_SELECTOR, 'p[data-l10n-id="contactsOrderBy"]')
    _order_by_last_name_switch_locator = (By.CSS_SELECTOR, 'input[name="order.lastname"]')
    _import_from_sim_button_locator = (By.CSS_SELECTOR, 'button.icon-sim[data-l10n-id="importSim2"]')
    _import_from_sdcard_locator = (By.CSS_SELECTOR, 'button.icon-sd[data-l10n-id="importMemoryCard"]')
    _import_from_gmail_button_locator = (By.CSS_SELECTOR, 'button.icon-gmail[data-l10n-id="importGmail"]')
    _import_from_windows_live_button_locator = (By.CSS_SELECTOR, 'button.icon-live[data-l10n-id="importLive"]')
    _back_from_import_contacts_locator = (By.ID, 'import-settings-back')
    _export_to_sd_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="memoryCard"]')
    _import_contacts_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="importContactsTitle"]')
    _export_contacts_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="exportContactsTitle"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_settings_close_button_to_load()

    def wait_for_settings_close_button_to_load(self):
        self.wait_for_element_displayed(*self._settings_close_button_locator)

    def tap_order_by_last_name(self):
        self.wait_for_element_displayed(*self._order_by_last_name_locator)
        self.marionette.find_element(*self._order_by_last_name_locator).click()

    @property
    def order_by_last_name(self):
        return self.marionette.find_element(*self._order_by_last_name_switch_locator).is_selected()

    def tap_import_contacts(self):
        self.wait_for_element_displayed(*self._import_contacts_locator)
        self.marionette.find_element(*self._import_contacts_locator).tap()

    def tap_export_contacts(self):
        self.wait_for_element_displayed(*self._export_contacts_locator)
        self.marionette.find_element(*self._export_contacts_locator).tap()

    def tap_import_from_sim(self):
        self.wait_for_element_displayed(*self._import_from_sim_button_locator)
        self.marionette.find_element(*self._import_from_sim_button_locator).tap()
        self.wait_for_element_not_displayed(*self._loading_overlay_locator)
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    def tap_import_from_sdcard(self):
        self.wait_for_element_displayed(*self._import_from_sdcard_locator)
        self.marionette.find_element(*self._import_from_sdcard_locator).tap()
        self.wait_for_element_not_displayed(*self._loading_overlay_locator)

    def tap_export_to_sd(self):
        self.wait_for_element_displayed(*self._export_to_sd_button_locator)
        self.marionette.find_element(*self._export_to_sd_button_locator).tap()
        self.wait_for_element_not_displayed(*self._loading_overlay_locator)

    def tap_done(self):
        self.wait_for_element_displayed(*self._settings_close_button_locator)
        self.marionette.find_element(*self._settings_close_button_locator).click()
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    def tap_back_from_import_contacts(self):
        self.wait_for_element_displayed(*self._back_from_import_contacts_locator)
        self.marionette.find_element(*self._back_from_import_contacts_locator).tap()

