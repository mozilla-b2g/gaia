# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class MediaStorage(Base):

    _music_size_locator = (By.CSS_SELECTOR, '.color-music > a > .size')
    _pictures_size_locator = (By.CSS_SELECTOR, '.color-pictures > a > .size')
    _movies_size_locator = (By.CSS_SELECTOR, '.color-videos > a > .size')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._music_size_locator)
        self.wait_for_element_displayed(*self._pictures_size_locator)
        self.wait_for_element_displayed(*self._movies_size_locator)

    @property
    def music_size(self):
        return self.marionette.find_element(*self._music_size_locator).text

    @property
    def pictures_size(self):
        return self.marionette.find_element(*self._pictures_size_locator).text

    @property
    def movies_size(self):
        return self.marionette.find_element(*self._movies_size_locator).text
