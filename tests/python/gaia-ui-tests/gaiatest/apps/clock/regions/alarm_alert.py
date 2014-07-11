# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class AlarmAlertScreen(Base):

    _alarm_frame_locator = (By.CSS_SELECTOR, '#attention-screen > iframe[data-frame-origin*="clock"]')
    _stop_button_locator = (By.ID, 'ring-button-stop')
    _alarm_label_locator = (By.ID, 'ring-label')

    def wait_for_alarm_to_trigger(self):
        self.wait_for_element_displayed(*self._alarm_frame_locator, timeout=30)
        alarm_frame = self.marionette.find_element(*self._alarm_frame_locator)
        self.marionette.switch_to_frame(alarm_frame)

    def tap_stop_alarm(self):
        self.wait_for_element_displayed(*self._stop_button_locator)
        self.marionette.find_element(*self._stop_button_locator).tap()

    @property
    def alarm_label(self):
        self.wait_for_element_displayed(*self._alarm_label_locator)
        return self.marionette.find_element(*self._alarm_label_locator).text
