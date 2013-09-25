# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class DoNotTrack(Base):

    _allow_tracking_checkbox_locator = (By.XPATH, '//li[p[@data-l10n-id="allowTracking"]]/label')
    _do_not_track_checkbox_locator = (By.XPATH, '//li[p[@data-l10n-id="doNotHavePrefOnTracking"]]/label')

    def tap_allow_tracking(self):
        el = self.marionette.find_element(*self._allow_tracking_checkbox_locator)
        checked = el.get_attribute('checked')
        el.tap()
        self.wait_for_condition(lambda m: el.get_attribute('checked') is not checked)

    def tap_do_not_track(self):
        el = self.marionette.find_element(*self._do_not_track_checkbox_locator)
        checked = el.get_attribute('checked')
        el.tap()
        self.wait_for_condition(lambda m: el.get_attribute('checked') is not checked)
