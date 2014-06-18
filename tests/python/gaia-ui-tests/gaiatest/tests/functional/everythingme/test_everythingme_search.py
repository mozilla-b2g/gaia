# -*- coding: utf-8 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestEverythingMeSearch(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Search Results', 'geolocation', 'deny')
        self.connect_to_network()

    def test_launch_everything_me_search(self):
        # Tests a search with a common string.
        # Asserts that the title and shortcuts are listed

        test_string = u'News'
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        search_panel = homescreen.tap_search_bar()
        search_panel.type_into_search_box(test_string)

        search_panel.wait_for_everything_me_results_to_load(4)

        self.assertGreater(len(search_panel.link_results), 0)
