# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette_driver import By, Wait

from gaiatest.apps.search.app import Search
from gaiatest.apps.system.regions.cards_view import CardsView


class TestLaunchViaManifest(GaiaTestCase):
    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')

    def test_launch_manifest(self):
        search = Search(self.marionette)
        search.launch()

        self.device.touch_home_button()

        search.launch()

        browser = search.go_to_url(self.test_url)
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'Mozilla')

        self.device.touch_home_button()

        # This should open the previous opened browser window
        search.launch()

        browser = search.go_to_url('data:text/html;charset=utf-8,<title>hello</title>')
        browser.switch_to_content()
        Wait(self.marionette).until(lambda m: m.title == 'hello')
        browser.switch_to_chrome()

        # This shouldn't do anything
        search.launch()

        self.device.hold_home_button()
        cards_view = CardsView(self.marionette)
        cards_view.wait_for_cards_view()
        cards_view.cards[0].wait_for_centered()
        self.assertEqual(len(cards_view.cards), 1, 'Should have 1 card to display')
        self.assertTrue(cards_view.cards[0].is_displayed)
        self.assertEqual(cards_view.cards[0].title, 'hello')
