# -*- coding: utf-8 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestEverythingMeSearchAccented(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')
        self.connect_to_network()

    def test_launch_everything_me_search_accented(self):
        # Tests a search with accented characters.
        # Asserts that title and shortcut results are returned correctly

        test_string = u'Pétanque'
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        search_panel = homescreen.tap_search_bar()
        search_panel.wait_for_everything_me_loaded()
        search_panel.type_into_search_box(test_string)

        search_panel.wait_for_type('Sports')
        search_panel.wait_for_everything_me_results_to_load()

        self.assertGreater(len(search_panel.results), 0)
