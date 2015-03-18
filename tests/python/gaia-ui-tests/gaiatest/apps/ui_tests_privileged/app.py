# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


UI_TESTS_PRIVILEGED = "UI tests - Privileged App"


class UiTestsPivileged(Base):

    _contacts_locator = (By.LINK_TEXT, 'Contacts')
    _get_user_media_locator = (By.LINK_TEXT, 'getUserMedia')
    _geolocation_locator = (By.LINK_TEXT, 'Geolocation')
    _device_storage_locator = (By.LINK_TEXT, 'Device Storage')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.name = UI_TESTS_PRIVILEGED

    def launch(self):
        Base.launch(self, launch_timeout=120000)

    def tap_contacts_option(self):
        element = Wait(self.marionette, timeout=120).until(
            expected.element_present(*self._contacts_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

        from gaiatest.apps.ui_tests_privileged.regions.contacts import ContactsPage

        return ContactsPage(self.marionette)

    def tap_get_user_media_option(self):
        element = Wait(self.marionette, timeout=120).until(
            expected.element_present(*self._get_user_media_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

        from gaiatest.apps.ui_tests_privileged.regions.user_media import UserMediaPage

        return UserMediaPage(self.marionette)

    def tap_geolocation_option(self):
        element = Wait(self.marionette, timeout=120).until(
            expected.element_present(*self._geolocation_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

        from gaiatest.apps.ui_tests_privileged.regions.geolocation import GeolocationPage

        return GeolocationPage(self.marionette)

    def tap_device_storage_option(self):
        element = Wait(self.marionette, timeout=120).until(
            expected.element_present(*self._device_storage_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

        from gaiatest.apps.ui_tests_privileged.regions.device_storage import DeviceStoragePage

        return DeviceStoragePage(self.marionette)
