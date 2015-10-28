# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.search.app import Search
from gaiatest.apps.contacts.app import Contacts
from gaiatest.apps.gallery.app import Gallery


class TestCardsView(GaiaImageCompareTestCase):

    images = 'IMG_0001.jpg'
    image_count = 4

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)
        self.push_resource(self.images, count=self.image_count)

        self.take_screenshot(top_frame=True)

        self.contacts = Contacts(self.marionette)
        self.contacts.launch()
        # 10 seconds for the actual user using the app a bit, and going back to homescreen
        time.sleep(10)
        self.device.touch_home_button()
        self.gallery = Gallery(self.marionette)
        self.gallery.launch()
        # 10 seconds for the actual user using the app a bit, and going back to homescreen
        time.sleep(10)
        self.device.touch_home_button()


    def test_cards_view_with_two_apps(self):
        """https://moztrap.mozilla.org/manage/case/2462/"""

        cards_view = CardsView(self.marionette)
        self.assertFalse(cards_view.is_displayed, 'Cards view not expected to be visible')

        # Pull up the cards view
        self.device.hold_home_button()
        cards_view.wait_for_cards_view()
        self.take_screenshot(top_frame=True)

        # disabled per Bug 1118390
        #self.change_orientation('landscape-primary')
        #self.take_screenshot()
        #self.change_orientation('portrait-primary')
        #self.take_screenshot()

        # Wait for first app ready
        cards_view.cards[1].wait_for_centered()
        self.assertIn(cards_view.cards[0].manifest_url[:19], self.contacts.manifest_url)
        self.assertIn(cards_view.cards[1].manifest_url, self.gallery.manifest_url)
        cards_view.swipe_to_previous_app()

        # Wait for previous app ready
        cards_view.cards[0].wait_for_centered()
        # sleep inside above method is insufficient
        time.sleep(2)
        self.take_screenshot(top_frame=True)

        cards_view.cards[0].tap()
        cards_view.wait_for_cards_view_not_displayed()
        self.take_screenshot(top_frame=True) #bug 1151571 will cause blank screen capture

        self.assertTrue(self.contacts.is_displayed)

        # take screenshot and pause, otherwise there will be a collision
    def change_orientation(self, orientation, wait=2):
        self.device.change_orientation(orientation)
        time.sleep(wait)
