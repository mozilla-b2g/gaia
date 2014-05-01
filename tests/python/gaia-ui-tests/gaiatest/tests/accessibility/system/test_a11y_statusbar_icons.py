# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.rocketbar import RocketBar
from gaiatest.apps.system.app import System


class TestStatusBarIconsAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.rocket_bar = RocketBar(self.marionette)
        self.system = System(self.marionette)

    def test_a11y_statusbar_icons(self):
        self.system.wait_for_status_bar_icon_displayed()
        self.rocket_bar.a11y_rocket_bar_activate()
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *self.system._status_bar_icons_locator)))
