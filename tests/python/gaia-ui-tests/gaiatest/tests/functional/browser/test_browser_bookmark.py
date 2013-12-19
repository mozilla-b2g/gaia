# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.apps.homescreen.app import Homescreen


class TestBrowserBookmark(GaiaTestCase):

    _bookmark_added = False

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        import time
        curr_time = repr(time.time()).replace('.', '')
        self.bookmark_title = 'gaia%s' % curr_time[10:]

    def test_browser_bookmark(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/452
        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://mozqa.com/data/firefox/layout/mozilla.html')

        browser.tap_bookmark_button()
        browser.tap_add_bookmark_to_home_screen_choice_button()
        browser.type_bookmark_title(self.bookmark_title)
        browser.tap_add_bookmark_to_home_screen_dialog_button()

        # Switch to Home Screen to look for bookmark
        homescreen = Homescreen(self.marionette)
        homescreen.touch_home_button()

        self._bookmark_added = homescreen.is_app_installed(self.bookmark_title)

        self.assertTrue(self._bookmark_added, 'The bookmark %s was not found to be installed on the home screen.' % self.bookmark_title)
