# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class UserMediaPage(Base):
    _audio_button_locator = (By.XPATH, '//button[text()="Audio1"]')
    _video_button_locator = (By.XPATH, '//button[text()="Video1"]')

    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='getusermedia']")

    def switch_to_frame(self):
        frame = Wait(self.marionette).until(
            expected.element_present(*self._frame_locator))
        Wait(self.marionette).until(expected.element_displayed(frame))
        self.marionette.switch_to_frame(frame)

    def tap_audio1_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._audio_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_video1_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._video_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
