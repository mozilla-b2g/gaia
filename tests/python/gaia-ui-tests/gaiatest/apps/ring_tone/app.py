# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette import Wait
from gaiatest.apps.base import Base, PageRegion


class RingTone(Base):
    name = 'Ringtones'
    _ring_tone_locator = (By.CSS_SELECTOR, '#list-parent section > ul > li')
    _set_button_locator = (By.ID, 'set')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()

    def set_ringtone(self):
        self.marionette.find_element(*self._set_button_locator).tap()

    @property
    def ring_tones(self):
        return [self.RingToneItem(self.marionette, item)
                for item in self.marionette.find_elements(*self._ring_tone_locator)]

    class RingToneItem(PageRegion):
        _name_locator = (By.CSS_SELECTOR, 'p.name')
        _radio_button_locator = (By.CSS_SELECTOR, 'label.pack-radio')

        @property
        def name(self):
            return self.root_element.find_element(*self._name_locator).text

        def select_ring_tone(self):
            self.root_element.find_element(*self._radio_button_locator).tap()
