# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.system.regions.cards_view import CardsView

class TestBrowserShowWindowsButton(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.apps.set_permission_by_url(Search.manifest_url, 'geolocation', 'deny')

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_browser_windows_menu_button(self):
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)

        browser.tap_menu_button()
        browser.tap_new_window()
        browser.tap_windows_button()

        self.cards_view = CardsView(self.marionette)
        self.wait_for_condition(lambda m: self.cards_view.is_cards_view_displayed)
