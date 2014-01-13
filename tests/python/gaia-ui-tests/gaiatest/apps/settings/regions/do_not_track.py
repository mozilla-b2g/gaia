# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class DoNotTrack(Base):

    _allow_tracking_checkbox_locator = (By.XPATH, '//li/label[span[@data-l10n-id="allowTracking"]]')
    _disallow_tracking_checkbox_locator = (By.XPATH, '//li/label[span[@data-l10n-id="doNotTrackActions"]]')
    _do_not_have_pref_on_tracking_checkbox_locator = (By.XPATH, '//li/label[span[@data-l10n-id="doNotHavePrefOnTracking"]]')

    def tap_allow_tracking(self):
        el = self.marionette.find_element(*self._allow_tracking_checkbox_locator)
        el.tap()
        self.wait_for_condition(lambda m: self.data_layer.get_setting('privacy.donottrackheader.value') == '0')

    def tap_disallow_tracking(self):
        el = self.marionette.find_element(*self._disallow_tracking_checkbox_locator)
        el.tap()
        self.wait_for_condition(lambda m: self.data_layer.get_setting('privacy.donottrackheader.value') == '1')

    def tap_do_not_have_pref_on_tracking(self):
        el = self.marionette.find_element(*self._do_not_have_pref_on_tracking_checkbox_locator)
        el.tap()
        self.wait_for_condition(lambda m: self.data_layer.get_setting('privacy.donottrackheader.value') == '-1')
