# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaData
from gaiatest.apps.base import Base


class DoNotTrack(Base):

    _tracking_checkbox_locator = (By.XPATH, "//input[@name='privacy.donottrackheader.enabled']/..")

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.data_layer = GaiaData(self.marionette)

    def tap_tracking(self, enabled):
        if self.data_layer.get_setting('privacy.donottrackheader.enabled') != enabled:
            el = self.marionette.find_element(*self._tracking_checkbox_locator)
            el.tap()
            self.wait_for_condition(lambda m: self.data_layer.get_setting('privacy.donottrackheader.enabled') == enabled)
