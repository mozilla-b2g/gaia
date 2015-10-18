# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest import GaiaTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.system.regions.cards_view import CardsView


class TestBrowserNewWindow(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')
        self.test_url2 = self.marionette.absolute_url('mozilla_community.html')

    def test_browser_new_window(self):
        search = Search(self.marionette)
        search.launch()
        browser = search.go_to_url(self.test_url)
        browser.wait_for_page_to_load()

        browser.tap_menu_button()
        browser.open_new_window()
        search.set_root_element()
        search.wait_to_be_displayed()
        browser2 = search.go_to_url(self.test_url2)
        browser2.wait_for_page_to_load()
        browser2.switch_to_content()
        self.assertEqual('Mozilla Community', self.marionette.title)
        browser2.switch_to_chrome()

        cards_view = CardsView(self.marionette)
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()
        cards_view.cards[1].wait_for_centered()
        self.assertEqual(len(cards_view.cards), 2, 'Should have 1 card to display')

        self.assertEqual('Mozilla', cards_view.cards[0].title)
        self.assertIn(cards_view.cards[0].subtitle, self.test_url)
        self.assertEqual('Mozilla Community', cards_view.cards[1].title)
        self.assertIn(cards_view.cards[1].subtitle, self.test_url2)

        cards_view.swipe_to_previous_app()
        cards_view.cards[0].wait_for_centered()
        self.assertFalse(browser.is_displayed())
        self.assertFalse(browser2.is_displayed())
        cards_view.cards[0].tap()

        browser.wait_to_be_displayed()
        self.assertTrue(browser.is_displayed())
        self.assertFalse(browser2.is_displayed())
