# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class AddReview(Base, dict):
    """
    Page for adding reviews.
    """

    _add_review_input_field_locator = (By.ID, 'id_body')
    _submit_review_button_locator = (By.CSS_SELECTOR, 'button[type="submit"]')
    _review_box_locator = (By.CSS_SELECTOR, '.add-review-form')
    _rating_locator = (By.CSS_SELECTOR, ".ratingwidget.stars-0 > label[data-stars='%s']")

    def __init__(self, marionette, **kwargs):
        Base.__init__(self, marionette)
        self.wait_for_element_present(*self._review_box_locator)

    def set_review_rating(self, rating):
        self.marionette.find_element(self._rating_locator[0], self._rating_locator[1] % rating).tap()

    def type_review(self, text):
        self.marionette.find_element(*self._add_review_input_field_locator).send_keys(text)

    def write_a_review(self, rating, body):
        self.set_review_rating(rating)
        self.type_review(body)
        self.marionette.find_element(*self._submit_review_button_locator).tap()
