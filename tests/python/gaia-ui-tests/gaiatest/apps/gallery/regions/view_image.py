# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.form_controls.header import GaiaHeader


class ViewImage(Base):

    _header_locator = (By.ID, 'header')
    _banner_message_locator = (By.ID, 'message')
    _save_image_button_locator = (By.ID, 'save')
    _image_locator = (By.CSS_SELECTOR, 'img.image-view')
    manifest_url = '{}gallery{}/manifest.webapp'.format(Base.DEFAULT_PROTOCOL,Base.DEFAULT_APP_HOSTNAME)

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        from gaiatest.apps.gallery.app import Gallery
        Gallery(self.marionette).wait_to_be_displayed()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._image_locator))))

    @property
    def is_image_visible(self):
        return self.is_element_displayed(*self._image_locator)

    @property
    def banner_message(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._banner_message_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        return element.text

    def tap_back_button(self):
        GaiaHeader(self.marionette, self._header_locator).go_back_and_exit(
            app=self, add_statusbar_height=False)
        self.apps.switch_to_displayed_app()

    def tap_save_image(self):
        self.marionette.find_element(*self._save_image_button_locator).tap()
