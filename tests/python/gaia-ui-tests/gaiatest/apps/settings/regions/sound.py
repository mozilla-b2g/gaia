# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Sound(Base):
    _ring_tone_selector_locator = (By.CSS_SELECTOR, '.ring-tone-selection')
    _current_ring_tone_locator = (By.CSS_SELECTOR, '.ring-tone-selection > small')

    @property
    def current_ring_tone(self):
        return self.marionette.find_element(*self._current_ring_tone_locator).text

    def tap_ring_tone_selector(self):
        self.marionette.find_element(*self._ring_tone_selector_locator).tap()
        from gaiatest.apps.ring_tone.app import RingTone
        return RingTone(self.marionette)
