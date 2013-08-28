# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.camera.app import Camera


class SelectAttachment(Base):

    _actions_menu_locator = (By.CSS_SELECTOR, 'div[role=dialog] > menu.actions')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*self._actions_menu_locator)

    def tap_attachment_type(self, attachment_type):
        menu = self.marionette.find_element(*self._actions_menu_locator)
        for item in menu.find_elements(By.CSS_SELECTOR, 'li'):
            if item.text == attachment_type:
                item.tap()
                break
        else:
            raise Exception('Invalid attachment type: %s' % attachment_type)

    def tap_camera(self):
        self.tap_attachment_type('Camera')
        return Camera(self.marionette)
