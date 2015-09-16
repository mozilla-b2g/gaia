# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class FindMyDevice(Base):

    _page_locator = (By.ID, 'findmydevice')
    _login_locator = (By.ID, 'findmydevice-login-btn')
    _checkbox_locator = (By.CSS_SELECTOR, '#findmydevice-enabled gaia-switch')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_login(self):
        login = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._login_locator))
        Wait(self.marionette).until(expected.element_displayed(login))
        login.tap()
        # After tapping, we are getting into the Firefox Accounts login page
        from gaiatest.apps.system.regions.fxaccounts import FirefoxAccount
        return FirefoxAccount(self.marionette)

    def wait_for_enable_switch_to_be_turned_on(self):
        Wait(self.marionette, timeout=60).until(
            expected.element_displayed(*self._checkbox_locator))
        Wait(self.marionette).until(lambda m:
            GaiaBinaryControl(m, self._checkbox_locator).is_checked is True)
