# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest.apps.base import PageRegion

class Timer(PageRegion):
    _timer_view_locator = (By.ID, 'timer-panel')

    def __init__(self, marionette):
        PageRegion.__init__(self, marionette)
        view = self.marionette.find_element(*self._timer_view_locator)
        Wait(self.marionette).until(lambda m: view.location['x'] == 0 and view.is_displayed())
