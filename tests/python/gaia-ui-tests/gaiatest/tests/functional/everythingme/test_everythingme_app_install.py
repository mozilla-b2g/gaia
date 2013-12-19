# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestEverythingMeInstallApp(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')
        self.connect_to_network()

    def test_installing_everything_me_app(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/67

        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()

        search_panel = homescreen.tap_search_bar()
        search_panel. wait_for_categories_to_load()
        self.assertGreater(search_panel.categories_count, 0)
        search_panel.categories[0].tap()

        search_panel.wait_for_app_icons_displayed()

        app_name = search_panel.results[0].name
        search_panel.results[0].tap_to_install()

        self.assertTrue(homescreen.is_app_installed(app_name),
                        'The app %s was not found to be installed on the home screen.' % app_name)
