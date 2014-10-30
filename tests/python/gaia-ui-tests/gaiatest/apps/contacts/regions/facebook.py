# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class FacebookLogin(Base):

    _facebook_login_iframe_locator = ('css selector', 'iframe[data-url*="m.facebook.com/login.php"]', 60)
    _facebook_login_name_locator = ('css selector', '#u_0_0 input[name="email"]')
    _facebook_login_password_locator = ('css selector', '#u_0_0 input[name="pass"]')
    _facebook_login_button_locator = ('css selector', '#u_0_1')

    def switch_to_facebook_login_frame(self):
        self.marionette.switch_to_frame()
        facebook_login_iframe = self.wait_for_element_present(*self._facebook_login_iframe_locator)
        self.marionette.switch_to_frame(facebook_login_iframe)

    def facebook_login(self, user, passwd):
        self.wait_for_element_displayed(*self._facebook_login_name_locator)
        self.marionette.find_element(*self._facebook_login_name_locator).send_keys(user)
        self.marionette.find_element(*self._facebook_login_password_locator).send_keys(passwd)
        self.keyboard.dismiss()
        self.marionette.find_element(*self._facebook_login_button_locator).tap()

        # Go back to displayed Contacts app before waiting for the picker
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == 'Contacts')
        self.apps.switch_to_displayed_app()

        # switch to facebook import page to select the friends
        from gaiatest.apps.contacts.regions.contact_import_picker import ContactImportPicker
        return ContactImportPicker(self.marionette)
