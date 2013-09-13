# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class EditPhoto(Base):

    _edit_view_locator = (By.ID, 'edit-view')
    _edit_effect_button_locator = (By.ID, 'edit-effect-button')
    _effect_options_locator = (By.CSS_SELECTOR, '#edit-effect-options a')
    _edit_save_locator = (By.ID, 'edit-save-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._edit_view_locator)

    def tap_edit_effects_button(self):
        self.marionette.find_element(*self._edit_effect_button_locator).tap()
        self.wait_for_element_displayed(*self._effect_options_locator)

    def tap_edit_save_button(self):
        self.marionette.find_element(*self._edit_save_locator).tap()
        from gaiatest.apps.gallery.app import Gallery
        return Gallery(self.marionette)

    @property
    def effects(self):
        return [self.Effect(marionette=self.marionette, element=effect)
                       for effect in self.marionette.find_elements(*self._effect_options_locator)]

    class Effect(PageRegion):

        def tap(self):
            self.root_element.tap()
            self.wait_for_condition(lambda m: 'selected' in self.root_element.get_attribute('class'))
