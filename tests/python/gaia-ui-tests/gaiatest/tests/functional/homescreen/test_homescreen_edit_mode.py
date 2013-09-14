# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest import GaiaTestCase


class TestEditMode(GaiaTestCase):

    _visible_apps_locator = (By.CSS_SELECTOR, 'div.page[style*="transform: translateX(0px);"] > ol > .icon')
    _edit_mode_locator = (By.CSS_SELECTOR, 'body[data-mode="edit"]')

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = self.apps.launch('Homescreen')

    def test_access_and_leave_edit_mode(self):

        self._go_to_next_page()

        # go to edit mode
        app = self.marionette.find_element(*self._visible_apps_locator)
        Actions(self.marionette).\
            press(app).\
            wait(3).\
            release().\
            perform()

        #verify that the delete app icons appear
        self.assertTrue(self.is_element_present(*self._edit_mode_locator))

        #tap home button and verify that delete app icons are no longer visible
        self._touch_home_button()

        self.assertFalse(self.is_element_present(*self._edit_mode_locator))

    def _touch_home_button(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

    def _go_to_next_page(self):
        self.marionette.execute_script('window.wrappedJSObject.GridManager.goToNextPage()')
        self.wait_for_condition(lambda m: m.find_element('tag name', 'body')
            .get_attribute('data-transitioning') != 'true')
