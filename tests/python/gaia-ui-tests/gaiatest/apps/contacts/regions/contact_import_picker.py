# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base

class ContactImportPicker(Base):

    _contact_import_picker_frame_locator = (By.ID, 'fb-extensions')
    _import_button_locator = (By.ID, 'import-action')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._contact_import_picker_frame_locator)
        select_contacts = self.marionette.find_element(*self._contact_import_picker_frame_locator)
        self.marionette.switch_to_frame(select_contacts)

    def tap_import_button(self):
        self.marionette.execute_script('window.wrappedJSObject.importer.ui.importAll()', special_powers=True)
        # TODO uncomment this when Bug 932804 is resolved
        # self.marionette.find_element(*self._import_button_locator).tap()
        self.apps.switch_to_displayed_app()
        self.wait_for_element_not_displayed(*self._contact_import_picker_frame_locator)
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)

    def tap_select_all(self):
        # TODO replace this with proper tap when Bug 932804 is resolved
        self.marionette.execute_script('window.wrappedJSObject.importer.ui.selectAll()', special_powers=True)
        self.wait_for_condition(lambda m : m.find_element(*self._import_button_locator).is_enabled())
