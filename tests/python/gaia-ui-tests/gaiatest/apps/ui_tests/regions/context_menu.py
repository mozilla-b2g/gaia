# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
from marionette.by import By
from gaiatest.apps.base import Base

from marionette.marionette import Actions


class ContextMenuPage(Base):
    _context_menu_body_locator = (By.CSS_SELECTOR, "body > section")
    _frame_locator = (By.CSS_SELECTOR, "#test-iframe[src*='contextmenu']")

    def __init__(self, marionette):
        Base.__init__(self, marionette)

    def switch_to_frame(self):
        self.wait_for_element_displayed(*self._frame_locator)
        context_menu_page_iframe = self.marionette.find_element(*self._frame_locator)
        self.marionette.switch_to_frame(context_menu_page_iframe)

    def long_press_context_menu_body(self):
        self.wait_for_condition(lambda m: m.find_element(*self._context_menu_body_locator).is_displayed())
        context_menu_body = self.marionette.find_element(*self._context_menu_body_locator)
        Actions(self.marionette).press(context_menu_body).wait(1).release().perform()

        from gaiatest.apps.system.regions.activities import Activities

        return Activities(self.marionette)
