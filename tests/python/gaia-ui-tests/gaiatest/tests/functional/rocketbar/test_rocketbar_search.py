# -*- coding: utf-8 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.app import System


class TestRocketBarSearch(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.set_setting('search.suggestions.enabled', True)
        self.connect_to_local_area_network()

    def test_launch_rocketbar_search(self):
        # Tests a search with a common string.
        # Asserts that the title and shortcuts are listed

        test_string = u'News'

        search_panel = System(self.marionette).tap_search_bar()
        search_panel.type_into_search_box(test_string)

        search_panel.wait_for_search_results_to_load(3)

        self.assertGreater(len(search_panel.link_results), 0)
