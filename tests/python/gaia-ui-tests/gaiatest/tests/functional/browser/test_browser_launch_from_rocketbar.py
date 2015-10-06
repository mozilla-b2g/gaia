# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette_driver import Wait

from gaiatest.apps.homescreen.app import Homescreen


class TestLaunchViaManifest(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_launch_manifest(self):
        self.apps.switch_to_displayed_app()
        search_panel = Homescreen(self.marionette).tap_search_bar()
        browser = search_panel.go_to_url(self.test_url)
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')
