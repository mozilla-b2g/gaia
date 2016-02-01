# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Merge(Base):

    _iframe_locator = (By.CSS_SELECTOR, '.popupWindow.active iframe[data-url*="matching"]')
    _body_locator = (By.TAG_NAME, 'body')
    _merge_button = (By.ID, 'merge-action')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        marionette.switch_to_frame()
        
        merge_iframe = Wait(marionette).until(
            expected.element_present(*self._iframe_locator))        
        Wait(marionette).until(expected.element_displayed(merge_iframe))
        marionette.switch_to_frame(merge_iframe)

        body = marionette.find_element(*self._body_locator)
        Wait(marionette).until(lambda m: body.rect['y'] == 0)

    def tap_on_merge(self):
        Wait(self.marionette).until(
            expected.element_present(*self._merge_button)).tap()