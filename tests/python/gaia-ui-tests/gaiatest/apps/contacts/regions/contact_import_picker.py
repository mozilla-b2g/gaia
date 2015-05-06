# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import Base


class ContactImportPicker(Base):

    _contact_import_picker_frame_locator = (By.ID, 'fb-extensions')
    _import_button_locator = (By.ID, 'import-action')
    _friends_list_locator = (By.ID, 'friends-list')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._contact_import_picker_frame_locator))))
        select_contacts = self.marionette.find_element(*self._contact_import_picker_frame_locator)
        self.marionette.switch_to_frame(select_contacts)

    def tap_import_button(self, wait_for_import = True):
        self.marionette.execute_script('window.wrappedJSObject.importer.ui.importAll();', special_powers=True)
        # TODO uncomment this when Bug 932804 is resolved
        # self.marionette.find_element(*self._import_button_locator).tap()
        self.apps.switch_to_displayed_app()
        if wait_for_import:
            self.wait_for_element_not_displayed(*self._contact_import_picker_frame_locator, timeout=60)
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)

    def tap_first_friend(self):
        # TODO replace this with proper tap when Bug 932804 is resolved
        self.marionette.execute_script("""
            window.wrappedJSObject.document.getElementById("friends-list")
                  .getElementsByTagName("a")[1].click()
        """, special_powers=True)
        self.wait_for_element_not_displayed(*self._friends_list_locator)
        self.apps.switch_to_displayed_app()

    def tap_select_all(self):
        # TODO replace this with proper tap when Bug 932804 is resolved
        self.marionette.execute_script('window.wrappedJSObject.importer.ui.selectAll();', special_powers=True)
        el = self.marionette.find_element(*self._import_button_locator)
        Wait(self.marionette).until(expected.element_enabled(el))
