# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Settings(Base):
    #general email settings
    _email_account_locator = (By.CSS_SELECTOR, '.tng-account-item')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._email_account_locator)

    @property
    def email_accounts(self):
        return [self.Account(self.marionette, email_account) for email_account in self.marionette.find_elements(*self._email_account_locator)]

    class Account(PageRegion):
        _name_locator = (By.CSS_SELECTOR, 'a.tng-account-item-label')

        def tap(self):
            self.root_element.tap()
            return EmailAccountSettings(self.marionette)


class EmailAccountSettings(Base):
    #settings for a specific email account

    _delete_account_locator = (By.CSS_SELECTOR, '.tng-account-delete')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._delete_account_locator)

    def tap_delete(self):
        self.marionette.find_element(*self._delete_account_locator).tap()
        return DeleteConfirmation(self.marionette)


class DeleteConfirmation(Base):
    _delete_locator = (By.CSS_SELECTOR, 'body > .tng-account-delete-confirm #account-delete-ok')
    _cancel_locator = (By.CSS_SELECTOR, 'body > .tng-account-delete-confirm #account-delete-cancel')
    _message_locator = (By.CSS_SELECTOR, 'body > .tng-account-delete-confirm > section > p')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._delete_locator)

    def tap_delete(self):
        self.marionette.find_element(*self._delete_locator).tap()
