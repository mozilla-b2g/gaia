# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class ViewImage(Base):
    _gallery_iframe_locator = (By.CSS_SELECTOR, 'iframe[src = "app://gallery.gaiamobile.org/open.html"]')
    _header_locator = (By.ID, 'header')
    _image_locator = (By.CSS_SELECTOR, 'div.image-view')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        iframe = self.wait_for_element_present(*self._gallery_iframe_locator)
        self.marionette.switch_to_frame(iframe)
        self.wait_for_element_displayed(*self._image_locator)

    @property
    def is_image_visibile(self):
        return self.is_element_displayed(*self._image_locator)

    def tap_back_button(self):
        header = self.marionette.find_element(*self._header_locator)
        # TODO: replace this condition with tap on the back button, after Bug 1061698 is fixed
        header.tap(x=header.size['width'] - 300)

        # wait for the frame to close
        self.marionette.switch_to_frame()
        self.wait_for_element_not_present(*self._gallery_iframe_locator)

        self.apps.switch_to_displayed_app()
