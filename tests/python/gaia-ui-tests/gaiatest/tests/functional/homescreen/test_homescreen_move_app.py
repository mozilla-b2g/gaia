# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from marionette.marionette import Actions

from gaiatest import GaiaTestCase


class TestMoveApp(GaiaTestCase):

    _visible_apps_locator = (By.CSS_SELECTOR, 'div.page[style*="transform: translateX(0px);"] > ol > .icon')
    _edit_mode_locator = (By.CSS_SELECTOR, 'body[data-mode="edit"]')

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.homescreen = self.apps.launch('Homescreen')

    def test_move_app_position(self):
        """
        Verify the user can move an application around on the homescreen.
        https://moztrap.mozilla.org/manage/case/1317/
        """

        # go to app page
        self._go_to_next_page()
        first_app_before_move = self.marionette.find_element(*self._visible_apps_locator).text

        # activate edit mode
        self.assertFalse(self.is_element_present(*self._edit_mode_locator))
        self._activate_edit_mode()
        self.assertTrue(self.is_element_present(*self._edit_mode_locator))
        time.sleep(1)

        # move first app on the position 12
        app = self.marionette.find_element(*self._visible_apps_locator)
        destination = self.marionette.find_elements(*self._visible_apps_locator)[12]

        Actions(self.marionette).\
            press(app).\
            wait(3).\
            move(destination).\
            wait(1).\
            release().\
            perform()

        time.sleep(1)

        # Exit edit mode
        self._touch_home_button()
        self.marionette.switch_to_frame(self.homescreen.frame)
        self.assertFalse(self.is_element_present(*self._edit_mode_locator))

        # check the app order and that the app on 10'th app is the right one
        first_app_after_move = self.marionette.find_element(*self._visible_apps_locator).text
        self.assertNotEqual(first_app_before_move, first_app_after_move)
        self.assertEqual(first_app_before_move, self.marionette.find_elements(*self._visible_apps_locator)[12].text)

    def _touch_home_button(self):
        self.marionette.switch_to_frame()
        self.marionette.execute_script("window.wrappedJSObject.dispatchEvent(new Event('home'));")

    def _go_to_next_page(self):
        self.marionette.execute_script('window.wrappedJSObject.GridManager.goToNextPage()')
        self.wait_for_condition(lambda m: m.find_element('tag name', 'body')
            .get_attribute('data-transitioning') != 'true')

    def _activate_edit_mode(self):
        app = self.marionette.find_element(*self._visible_apps_locator)
        Actions(self.marionette). \
            press(app).\
            wait(3).\
            release(). \
            perform()
