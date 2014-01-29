# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class ContactsPage(Base):    
    _insert_contact_button_locator = (By.ID, 'insert-contacts')

    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='contacts']")

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        contacts_page_iframe = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(contacts_page_iframe)

    def tap_insert_fake_contacts(self):
        self.wait_for_element_displayed(*self._insert_contact_button_locator)
        self.marionette.find_element(*self._insert_contact_button_locator).tap()
