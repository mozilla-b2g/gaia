# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class PermissionDialog(Base):

    _permission_dialog_locator = (By.ID, 'permission-dialog')
    _permission_dialog_message_locator = (By.ID, 'permission-message')
    _permission_confirm_button_locator = (By.ID, 'permission-yes')
    _permission_dismiss_button_locator = (By.ID, 'permission-no')

    def wait_for_permission_dialog_displayed(self):
        self.wait_for_element_displayed(*self._permission_dialog_locator)

    @property
    def permission_dialog_message(self):
        return self.marionette.find_element(*self._permission_dialog_message_locator).text

    def tap_to_confirm_permission(self):
        self.marionette.find_element(*self._permission_confirm_button_locator).tap()

    def tap_to_dismiss_permission(self):
        self.marionette.find_element(*self._permission_dismiss_button_locator).tap()
