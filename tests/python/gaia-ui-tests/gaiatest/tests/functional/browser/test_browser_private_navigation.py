# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.system.regions.cards_view import CardsView


class TestBrowserPrivateNavigation(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()
        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_browser_private_navigation(self):
        self.device.hold_home_button()

        cards_view = CardsView(self.marionette)
        private_window = cards_view.open_new_private_window()

        browser = private_window.go_to_url(self.test_url)
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')

        self.device.hold_home_button()

        cards_view = CardsView(self.marionette)
        cards_view.wait_for_cards_view()
        search = cards_view.open_new_browser()
        # This is to switch the marionette context to the browser content
        search.launch()
        self.assertEqual(search.history_items_count, 0)
