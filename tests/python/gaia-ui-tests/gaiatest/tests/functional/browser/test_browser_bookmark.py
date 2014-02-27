# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.apps.homescreen.app import Homescreen


class TestBrowserBookmark(GaiaTestCase):

    _bookmark_added = False

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        curr_time = repr(time.time()).replace('.', '')
        self.bookmark_title = 'gaia%s' % curr_time[10:]

    def test_browser_bookmark(self):
        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html')
        browser.tap_bookmark_button()

        bookmark = browser.tap_add_bookmark_to_home_screen_choice_button()
        bookmark.switch_to_add_bookmark_frame()
        bookmark.type_bookmark_title(self.bookmark_title)
        bookmark.tap_add_bookmark_to_home_screen_dialog_button()

        # Switch to Home Screen to look for bookmark
        self.device.touch_home_button()

        homescreen = Homescreen(self.marionette)
        self._bookmark_added = homescreen.is_app_installed(self.bookmark_title)

        self.assertTrue(self._bookmark_added, 'The bookmark %s was not found to be installed on the home screen.' % self.bookmark_title)
