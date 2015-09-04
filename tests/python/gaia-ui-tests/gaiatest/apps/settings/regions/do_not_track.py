# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By
from gaiatest.apps.base import Base
from gaiatest.form_controls.binarycontrol import GaiaBinaryControl


class DoNotTrack(Base):

    _page_locator = (By.ID, 'doNotTrack')
    _allow_tracking_radio_locator = (By.CSS_SELECTOR, 'gaia-radio[name="privacy.donottrackheader.value"][value="0"]')
    _disallow_tracking_radio_locator = (By.CSS_SELECTOR, 'gaia-radio[name="privacy.donottrackheader.value"][value="1"]')
    _do_not_have_pref_on_tracking_radio_locator = (By.CSS_SELECTOR, 'gaia-radio[name="privacy.donottrackheader.value"][value="-1"]')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_allow_tracking(self):
        GaiaBinaryControl(self.marionette, self._allow_tracking_radio_locator).enable()

    def tap_disallow_tracking(self):
        GaiaBinaryControl(self.marionette, self._disallow_tracking_radio_locator).enable()

    def tap_do_not_have_pref_on_tracking(self):
        GaiaBinaryControl(self.marionette, self._do_not_have_pref_on_tracking_radio_locator).enable()
