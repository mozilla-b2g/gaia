# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestRocketBarLaunchLink(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.data_layer.set_setting('search.suggestions.enabled', True)
        self.connect_to_local_area_network()

    def test_launch_rocketbar_link(self):
        search_string = 'Facebook'
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        search_panel = homescreen.tap_search_bar()
        search_panel.type_into_search_box(search_string)

        search_panel.confirm_suggestion_notice()
        search_panel.wait_for_search_results_to_load(1)

        search_panel.link_results[0].tap()

        self.assertIn(search_string.lower(), self.marionette.title.lower())
