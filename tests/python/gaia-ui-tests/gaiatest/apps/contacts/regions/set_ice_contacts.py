# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette_driver import expected, By, Wait

from gaiatest import GaiaApps
from gaiatest.apps.base import Base
from gaiatest.apps.contacts.app import Contacts
from gaiatest.form_controls.header import GaiaHeader
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class SetIceContacts(Base):

    _toggle_locator = (By.CSS_SELECTOR, 'gaia-switch[name="ice-contact-1-enabled"]')
    _select_ice_contact_1_locator = (By.ID, 'select-ice-contact-1')
    _ice_settings_header_locator = (By.ID, 'ice-settings-header')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        GaiaApps(marionette).switch_to_displayed_app()
        header = self.marionette.find_element(*self._ice_settings_header_locator)
        Wait(self.marionette).until(lambda m: header.rect['x'] == 0 and header.is_displayed())
    
    def enable_set_ice_contact(self):
         GaiaBinaryControl(self.marionette, self._toggle_locator).enable()
         return SetIceContacts(self.marionette)

    def select_ice_contact(self):
        self.marionette.find_element(*self._select_ice_contact_1_locator).tap()
        from gaiatest.apps.contacts.app import Contacts
        return Contacts(self.marionette)

    def go_back(self):
        GaiaHeader(self.marionette, self._ice_settings_header_locator).go_back()
        from gaiatest.apps.contacts.regions.settings_form import SettingsForm
        return SettingsForm(self.marionette)
