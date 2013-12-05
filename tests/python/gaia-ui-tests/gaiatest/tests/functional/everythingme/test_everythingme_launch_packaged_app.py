# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestEverythingMeSearchPanel(GaiaTestCase):

    app_name = 'Calendar'

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_launch_packaged_app_from_search_panel(self):
        """Launch packaged app from homescreen search panel.

        https://github.com/mozilla/gaia-ui-tests/issues/1169
        """
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        search_panel = homescreen.tap_search_bar()
        search_panel.wait_for_everything_me_loaded()
        search_panel.type_into_search_box(self.app_name)

        results = search_panel.installed_apps
        self.assertEqual(results[0].name, self.app_name)
        results[0].tap()

        self.assertEqual(self.apps.displayed_app.name.lower(), self.app_name.lower())
