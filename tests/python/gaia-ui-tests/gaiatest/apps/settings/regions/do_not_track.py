# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class DoNotTrack(Base):

    _do_not_track_label_locator = (By.CSS_SELECTOR, '#doNotTrack label')
    _do_not_track_checkbox_locator = (By.CSS_SELECTOR, '#doNotTrack input')

    @property
    def is_do_not_track_enabled(self):
        return self.marionette.find_element(*self._do_not_track_checkbox_locator).get_attribute('checked')

    def enable_do_not_track(self):
        self.marionette.find_element(*self._do_not_track_label_locator).tap()
        self.wait_for_condition(lambda m: self.is_do_not_track_enabled)

    def disable_do_not_track(self):
        self.marionette.find_element(*self._do_not_track_label_locator).tap()
        self.wait_for_condition(lambda m: not self.is_do_not_track_enabled)
