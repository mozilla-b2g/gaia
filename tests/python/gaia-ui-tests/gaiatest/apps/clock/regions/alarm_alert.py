# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class AlarmAlertScreen(Base):
    _alarm_frame_locator = (By.CSS_SELECTOR, 'iframe[mozapp*="clock"]:nth-child(1)')
    _stop_button_locator = (By.ID, 'ring-button-stop')
    _alarm_label_locator = (By.ID, 'ring-label')

    def wait_for_alarm_to_trigger(self):
        alarm_frame = Wait(self.marionette, timeout=60).until(
            expected.element_present(*self._alarm_frame_locator))
        Wait(self.marionette).until(expected.element_displayed(alarm_frame))
        self.marionette.switch_to_frame(alarm_frame)

    def tap_stop_alarm(self):
        stop_alarm_button = Wait(self.marionette).until(
            expected.element_present(*self._stop_button_locator))
        Wait(self.marionette).until(expected.element_displayed(stop_alarm_button))
        self.tap_element_from_system_app(stop_alarm_button)

    @property
    def alarm_label(self):
        alarm_label = Wait(self.marionette).until(
            expected.element_present(*self._alarm_label_locator))
        Wait(self.marionette).until(expected.element_displayed(alarm_label))
        return alarm_label.text
