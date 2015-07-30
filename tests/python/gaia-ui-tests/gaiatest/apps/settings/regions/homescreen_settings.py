# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class HomescreenSettings(Base):

    _icon_layout_locator = (By.CSS_SELECTOR, '#homescreen div.icon-dialog')

    def select_icon_layout(self, value):
        element = Wait(self.marionette).until(
            expected.element_present(*self._icon_layout_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.select(value)
