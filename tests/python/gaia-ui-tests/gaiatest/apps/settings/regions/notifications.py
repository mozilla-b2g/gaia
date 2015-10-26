# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Notifications(Base):

    _page_locator = (By.ID, 'notifications')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)
