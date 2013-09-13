# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class AppPermissions(Base):

    _section_locator = (By.ID, 'appPermissions')
    _apps_locator = (By.XPATH, "//section[@id='appPermissions']//li[a[text()='%s']]")

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._section_locator)
        self.wait_for_condition(lambda m: section.location['x'] == 0)

    def app_locator(self, app):
        return (self._apps_locator[0], self._apps_locator[1] % app)

    def tap_app(self, app):
        self.marionette.find_element(*self.app_locator(app)).tap()
        return AppPermissionsDetails(self.marionette)


class AppPermissionsDetails(Base):

    _section_locator = (By.ID, 'appPermissions-details')
    _permissions_locator = (By.CSS_SELECTOR, 'p[data-l10n-id="perm-geolocation"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        section = self.marionette.find_element(*self._section_locator)
        self.wait_for_condition(lambda m: section.location['x'] == 0)

    @property
    def is_geolocation_listed(self):
        return self.marionette.find_element(*self._permissions_locator).is_displayed()
