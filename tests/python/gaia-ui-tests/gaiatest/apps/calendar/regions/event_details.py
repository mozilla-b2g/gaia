# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest.apps.base import Base


class EventDetails(Base):

    _event_header_locator = (By.ID, 'show-event-header')
    _title_locator = (By.CSS_SELECTOR, '.title .content')
    _location_locator = (By.CSS_SELECTOR, '.location .content')

    def __init__(self, marionette):
        Base.__init__(self, marionette)

    @property
    def title(self):
        return self.marionette.find_element(*self._title_locator).text

    @property
    def location(self):
        return self.marionette.find_element(*self._location_locator).text
