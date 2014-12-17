# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import expected
from marionette import Wait
from marionette.by import By
from gaiatest.apps.base import Base


class MultipleSelectionView(Base):

    _select_picture_header_locator = (By.ID, 'thumbnails-number-selected')
    _thumbnail_list_view_locator = (By.CSS_SELECTOR, '.thumbnail')
    _share_thumbnail_locator = (By.ID, 'thumbnails-share-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        select_picture_header = Wait(self.marionette).until(
            expected.element_present(*self._select_picture_header_locator))
        Wait(self.marionette).until(expected.element_displayed(select_picture_header))

    def select_first_picture(self):
        self.thumbnails[0].tap()

    @property
    def thumbnails(self):
        return self.marionette.find_elements(*self._thumbnail_list_view_locator)

    def tap_share_button(self):
        share_button = Wait(self.marionette).until(
            expected.element_present(*self._share_thumbnail_locator))
        Wait(self.marionette).until(expected.element_displayed(share_button))
        share_button.tap()
        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)
