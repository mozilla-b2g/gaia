# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class MultipleSelectionView(Base):

    _select_picture_header_locator = (By.ID, 'thumbnails-number-selected')
    _thumbnail_list_view_locator = (By.CSS_SELECTOR, '.thumbnail')
    _share_thumbnail_locator = (By.ID, 'thumbnails-share-button')
    _delete_thumbnail_locator = (By.ID, 'thumbnails-delete-button')
    _delete_confirm_locator = (By.ID, 'confirm-ok')
    _delete_cancel_locator = (By.ID, 'confirm-cancel')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        select_picture_header = Wait(self.marionette).until(
            expected.element_present(*self._select_picture_header_locator))
        Wait(self.marionette).until(expected.element_displayed(select_picture_header))

    def select_first_picture(self):
        self.thumbnails[0].tap()

    def select_nth_picture(self, n):
        assert len(self.thumbnails) > n
        self.thumbnails[n].tap()

    @property
    def number_of_selected_images(self):
        select_picture_header = Wait(self.marionette).until(
            expected.element_present(*self._select_picture_header_locator))

        if 'selected' in select_picture_header.text:
            return int(select_picture_header.text[:1])
        else:
            return 0

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

    # one can choose to cancel deletion by entering optional parameter
    def tap_delete_button(self, confirm=True):
        delete_button = Wait(self.marionette).until(
            expected.element_present(*self._delete_thumbnail_locator))
        Wait(self.marionette).until(expected.element_displayed(delete_button))
        delete_button.tap()

        if confirm:
            confirm_decision_button = Wait(self.marionette).until(
                expected.element_present(*self._delete_confirm_locator))
        else:
            confirm_decision_button = Wait(self.marionette).until(
                expected.element_present(*self._delete_cancel_locator))
        Wait(self.marionette).until(expected.element_displayed(confirm_decision_button))
        confirm_decision_button.tap()
