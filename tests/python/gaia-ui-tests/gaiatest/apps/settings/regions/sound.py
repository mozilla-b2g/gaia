# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.ring_tone.app import RingTone


class Sound(Base):
    _page_locator = (By.ID, 'sound')
    _ring_tone_selector_locator = (By.CSS_SELECTOR, '.ring-tone-selection')
    _current_ring_tone_locator = (By.CSS_SELECTOR, '.ring-tone-selection > small')
    _alert_selector_locator = (By.ID, 'alerts')
    _manage_tones_selector_locator = (By.ID, 'manage-tones')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def ring_tone_selector_visible(self):
        return expected.element_displayed(*self._ring_tone_selector_locator)(self.marionette)

    @property
    def current_ring_tone(self):
        element = self.marionette.find_element(*self._current_ring_tone_locator)
        Wait(self.marionette).until(lambda m: element.text != '')
        return element.text

    def tap_ring_tone_selector(self):
        self.marionette.find_element(*self._ring_tone_selector_locator).tap()
        return RingTone(self.marionette)

    def tap_alerts_selector(self):
        self.marionette.find_element(*self._alert_selector_locator).tap()
        return RingTone(self.marionette)

    def tap_manage_tones_selector(self):
        self.marionette.find_element(*self._manage_tones_selector_locator).tap()
        return RingTone(self.marionette)

