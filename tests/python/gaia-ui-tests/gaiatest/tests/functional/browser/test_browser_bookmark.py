# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen
from gaiatest.apps.search.app import Search


class TestBrowserBookmark(GaiaTestCase):

    _bookmark_added = False

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

        self.test_url = self.marionette.absolute_url('mozilla.html')

        curr_time = repr(time.time()).replace('.', '')
        self.bookmark_title = 'gaia%s' % curr_time[10:]

    def test_browser_bookmark(self):
        search = Search(self.marionette)
        search.launch()

        browser = search.go_to_url(self.test_url)
        browser.tap_menu_button()
        bookmark = browser.tap_add_to_home()

        bookmark.type_bookmark_title(self.bookmark_title)
        bookmark.tap_add_bookmark_to_home_screen_dialog_button()

        # tap menu button to test to see if the add to homescreen button is removed
        browser.switch_to_chrome()
        browser.tap_menu_button()
        self._add_to_home=bookmark.is_add_to_home_button_not_in_dialog()
        self.assertFalse(self._add_to_home, 'Add to Homescreen is not in menu options')

        # Switch to Home Screen to look for bookmark
        self.device.touch_home_button()

        homescreen = Homescreen(self.marionette)
        homescreen.wait_for_app_icon_present(self.bookmark_title)
        self._bookmark_added = homescreen.is_app_installed(self.bookmark_title)

        self.assertTrue(self._bookmark_added, 'The bookmark %s was not found to be installed on the home screen.' % self.bookmark_title)

        # Delete the bookmark
        homescreen.activate_edit_mode()
        homescreen.bookmark(self.bookmark_title).tap_delete_app().tap_confirm(bookmark=True)

        homescreen.wait_to_be_displayed()
        self.apps.switch_to_displayed_app()
        homescreen.wait_for_bookmark_icon_not_present(self.bookmark_title)

        # Check that the bookmark icon is no longer displayed on the homescreen
        self._bookmark_added = homescreen.is_app_installed(self.bookmark_title)
        self.assertFalse(self._bookmark_added, 'The bookmark %s was not successfully removed from homescreen.' % self.bookmark_title)
