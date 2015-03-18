# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class ContactsPage(Base):
    _insert_contact_button_locator = (By.ID, 'insert-contacts')

    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='contacts']")

    def switch_to_frame(self):
        frame = Wait(self.marionette).until(
            expected.element_present(*self._frame_locator))
        Wait(self.marionette).until(expected.element_displayed(frame))
        self.marionette.switch_to_frame(frame)

    def tap_insert_fake_contacts(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._insert_contact_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
