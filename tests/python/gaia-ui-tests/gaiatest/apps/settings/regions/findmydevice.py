# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class FindMyDevice(Base):

    _login_locator = (By.ID, 'findmydevice-login-btn')
    _checkbox_locator = (By.CSS_SELECTOR, '#findmydevice-enabled input')
    _findmydevice_locator = (By.CSS_SELECTOR, 'span[data-l10n-id="findmydevice-enable"]')

    def tap_login(self):
        login = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._login_locator))
        Wait(self.marionette).until(expected.element_displayed(login))
        login.tap()
        # After tapping, we are getting into the Firefox Accounts login page
        from gaiatest.apps.system.regions.fxaccounts import FirefoxAccount
        return FirefoxAccount(self.marionette)

    def wait_for_enable_switch_to_be_turned_on(self):
        findmydevice = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._findmydevice_locator))
        Wait(self.marionette).until(expected.element_displayed(findmydevice))
        checkbox = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._checkbox_locator))
        Wait(self.marionette).until(expected.element_selected(checkbox))
