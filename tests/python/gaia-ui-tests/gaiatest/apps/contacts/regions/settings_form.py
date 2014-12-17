# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from gaiatest.apps.base import Base


class SettingsForm(Base):

    _settings_view_locator = (By.ID, 'view-settings')
    _loading_overlay_locator = (By.ID, 'loading-overlay')
    _settings_close_button_locator = (By.ID, 'settings-close')
    _order_by_last_name_locator = (By.CSS_SELECTOR, 'p[data-l10n-id="contactsOrderBy"]')
    _order_by_last_name_switch_locator = (By.CSS_SELECTOR, 'input[name="order.lastname"]')
    _import_from_sim_button_locator = (By.CSS_SELECTOR, "li[id*='import-sim-option'] button")
    _import_from_sdcard_locator = (By.CSS_SELECTOR, 'button.icon-sd')
    _import_from_gmail_button_locator = (By.CSS_SELECTOR, 'button.icon-gmail')
    _import_from_windows_live_button_locator = (By.CSS_SELECTOR, 'button.icon-live')
    _import_settings_header = (By.ID, 'import-settings-header');
    _export_to_sd_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="memoryCard"]')
    _import_contacts_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="importContactsButton"]')
    _export_contacts_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="exportContactsButton"]')
    _gmail_contacts_imported_locator = (By.CSS_SELECTOR, '.icon.icon-gmail > p > span')
    _import_settings_locator = (By.ID, 'import-settings')
    _select_contacts_locator = (By.ID, 'selectable-form')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        view = self.marionette.find_element(*self._settings_view_locator)
        Wait(self.marionette).until(lambda m: view.location['y'] == 0)

    def tap_order_by_last_name(self):
        last_name = Wait(self.marionette).until(
            expected.element_present(*self._order_by_last_name_locator))
        Wait(self.marionette).until(expected.element_displayed(last_name))
        last_name.click()

    @property
    def order_by_last_name(self):
        return self.marionette.find_element(*self._order_by_last_name_switch_locator).is_selected()

    def tap_import_contacts(self):
        import_contacts = Wait(self.marionette).until(
            expected.element_present(*self._import_contacts_locator))
        Wait(self.marionette).until(expected.element_displayed(import_contacts))
        import_contacts.tap()
        import_settings = self.marionette.find_element(*self._import_settings_locator)
        Wait(self.marionette).until(lambda m: import_settings.location['x'] == 0)

    def tap_export_contacts(self):
        export_contacts = Wait(self.marionette).until(
            expected.element_present(*self._export_contacts_locator))
        Wait(self.marionette).until(expected.element_displayed(export_contacts))
        export_contacts.tap()
        import_settings = self.marionette.find_element(*self._import_settings_locator)
        Wait(self.marionette).until(lambda m: import_settings.location['x'] == 0)

    def tap_import_from_sim(self):
        import_from_sim = Wait(self.marionette).until(
            expected.element_present(*self._import_from_sim_button_locator))
        Wait(self.marionette).until(expected.element_displayed(import_from_sim))
        import_from_sim.tap()
        from gaiatest.apps.contacts.app import Contacts
        status_message = Wait(self.marionette).until(
            expected.element_present(*Contacts._status_message_locator))
        Wait(self.marionette).until(expected.element_displayed(status_message))
        Wait(self.marionette).until(expected.element_not_displayed(status_message))

    @property
    def gmail_imported_contacts(self):
        return self.marionette.find_element(*self._gmail_contacts_imported_locator).text

    def tap_import_from_gmail(self):
        import_from_gmail = Wait(self.marionette).until(
            expected.element_present(*self._import_from_gmail_button_locator))
        Wait(self.marionette).until(expected.element_displayed(import_from_gmail))
        import_from_gmail.tap()
        from gaiatest.apps.contacts.regions.gmail import GmailLogin
        return GmailLogin(self.marionette)

    def tap_import_from_sdcard(self):
        import_from_sdcard = Wait(self.marionette).until(
            expected.element_present(*self._import_from_sdcard_locator))
        Wait(self.marionette).until(expected.element_displayed(import_from_sdcard))
        import_from_sdcard.tap()
        from gaiatest.apps.contacts.app import Contacts
        status_message = Wait(self.marionette).until(
            expected.element_present(*Contacts._status_message_locator))
        Wait(self.marionette).until(expected.element_displayed(status_message))
        Wait(self.marionette).until(expected.element_not_displayed(status_message))

    def tap_export_to_sd(self):
        export_to_sdcard = Wait(self.marionette).until(
            expected.element_present(*self._export_to_sd_button_locator))
        Wait(self.marionette).until(expected.element_displayed(export_to_sdcard))
        export_to_sdcard.tap()
        select_contacts = self.marionette.find_element(*self._select_contacts_locator)
        Wait(self.marionette).until(lambda m: select_contacts.location['y'] == 0)

    def tap_done(self):
        close = self.marionette.find_element(*self._settings_close_button_locator)
        close.tap()
        Wait(self.marionette).until(expected.element_not_displayed(close))
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    def tap_back_from_import_contacts(self):
        header = self.marionette.find_element(*self._import_settings_header)
        # TODO: remove tap with coordinates after Bug 1061698 is fixed
        header.tap(25, 25)
        Wait(self.marionette).until(expected.element_not_displayed(header))
