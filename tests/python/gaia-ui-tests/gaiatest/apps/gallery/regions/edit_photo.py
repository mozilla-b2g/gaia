# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class EditPhoto(Base):

    _canvas_locator = (By.ID, 'edit-preview-canvas')
    _edit_effect_button_locator = (By.ID, 'edit-effect-button')
    _effect_options_locator = (By.CSS_SELECTOR, '#edit-effect-options a')
    _edit_save_locator = (By.ID, 'edit-save-button')
    _edit_crop_button_locator = (By.ID, 'edit-crop-button')
    _crop_portrait_locator = (By.ID, 'edit-crop-aspect-portrait')
    _save_progress_bar_locator = (By.ID, 'save-progress')
    _edit_tool_apply_button_locator = (By.ID, 'edit-tool-apply-button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        # <canvas> is dynamically inserted
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._canvas_locator))))

    def tap_edit_effects_button(self):
        self.marionette.find_element(*self._edit_effect_button_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._effect_options_locator))))

    def tap_edit_crop_button(self):
        self.marionette.find_element(*self._edit_crop_button_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._crop_portrait_locator))))

    def tap_edit_tool_apply_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._edit_tool_apply_button_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()

    def tap_edit_save_button(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._edit_save_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        progress = self.marionette.find_element(*self._save_progress_bar_locator)
        Wait(self.marionette).until(expected.element_not_displayed(progress))
        from gaiatest.apps.gallery.app import Gallery
        return Gallery(self.marionette)

    def tap_portrait_crop(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._crop_portrait_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(lambda m: 'selected' in element.get_attribute('class'))

    @property
    def effects(self):
        return [self.Effect(marionette=self.marionette, element=effect)
                for effect in self.marionette.find_elements(*self._effect_options_locator)]

    class Effect(PageRegion):

        def tap(self):
            self.root_element.tap()
            Wait(self.marionette).until(lambda m: 'selected' in self.root_element.get_attribute('class'))
