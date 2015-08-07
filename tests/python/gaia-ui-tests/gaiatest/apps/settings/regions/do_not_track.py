# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class DoNotTrack(Base):

    _allow_tracking_radio_locator = (By.CSS_SELECTOR, 'gaia-radio[name="privacy.donottrackheader.value"][value="0"]')
    _disallow_tracking_radio_locator = (By.CSS_SELECTOR, 'gaia-radio[name="privacy.donottrackheader.value"][value="1"]')
    _do_not_have_pref_on_tracking_radio_locator = (By.CSS_SELECTOR, 'gaia-radio[name="privacy.donottrackheader.value"][value="-1"]')

    def tap_allow_tracking(self):
        element = self.marionette.find_element(
            *self._allow_tracking_radio_locator)
        element.tap()
        self.wait_for_custom_element_checked_state(element)

    def tap_disallow_tracking(self):
        element = self.marionette.find_element(
            *self._disallow_tracking_radio_locator)
        element.tap()
        self.wait_for_custom_element_checked_state(element)

    def tap_do_not_have_pref_on_tracking(self):
        element = self.marionette.find_element(
            *self._do_not_have_pref_on_tracking_radio_locator)
        element.tap()
        self.wait_for_custom_element_checked_state(element)
