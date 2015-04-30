# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class AttachmentOptions(Base):

    _attachment_options_locator = (By.CSS_SELECTOR, 'form.visible[role="dialog"][data-subtype="menu"]')
    _view_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="view-attachment-image"]')
    _cancel_button_locator = (By.CSS_SELECTOR, 'button[data-l10n-id="cancel"]')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        root_element = self.root_element
        Wait(self.marionette).until(lambda m: root_element.location['y'] == 0)

    def tap_cancel(self):
        root_element = self.root_element
        root_element.find_element(*self._cancel_button_locator).tap()
        Wait(self.marionette).until(expected.element_not_displayed(root_element))

    def tap_view_button(self):
        self.root_element.find_element(*self._view_button_locator).tap()
        from gaiatest.apps.gallery.regions.view_image import ViewImage
        return ViewImage(self.marionette)

    @property
    def root_element(self):
         return self.marionette.find_element(*self._attachment_options_locator)
