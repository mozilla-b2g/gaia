# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase


class TestLaunchHEREMapsApp(GaiaTestCase):
    _header_locator = (By.CSS_SELECTOR, 'div.header')

    def test_launch_HERE_maps_app(self):

        self.apps.launch('HERE Maps')
        self.wait_for_element_displayed(*self._header_locator)
        self.assertEqual(self.marionette.find_element(*self._header_locator).text, 'Welcome')
