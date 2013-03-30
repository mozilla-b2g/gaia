# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase

class TestEverythingMe(GaiaTestCase):

    # Everything.Me locators
    _shortcut_items_locator = ('css selector', '#shortcuts-items li')
    _facebook_icon_locator = ('xpath', "//div/b[text()='Facebook']")

    # Homescreen locators
    _homescreen_frame_locator = ('css selector', 'div.homescreen > iframe')
    _homescreen_landing_locator = ('id', 'landing-page')

    # Facebook app locator
    _facebook_iframe_locator = ('css selector', "iframe[data-url='http://touch.facebook.com/']")
    _facebook_title_locator = ('tag name', 'title')

    def setUp(self):

        GaiaTestCase.setUp(self)

        # Turn off geolocation prompt
        self.apps.set_permission('Homescreen', 'geolocation', 'deny')

        if self.wifi:
            self.data_layer.enable_wifi()
            self.data_layer.connect_to_wifi(self.testvars['wifi'])

        self.lockscreen.unlock()

    def test_launch_everything_me_app(self):
        # https://github.com/mozilla/gaia-ui-tests/issues/69

        # swipe to Everything.Me
        hs_frame = self.marionette.find_element(*self._homescreen_frame_locator)
        self.marionette.switch_to_frame(hs_frame)

        # We'll use js to flick pages for reliability/Touch is unreliable
        self.marionette.execute_script("window.wrappedJSObject.GridManager.goToPreviousPage();")

        # check for the available shortcut categories 
        self.wait_for_element_present(*self._shortcut_items_locator)

        shortcuts = self.marionette.find_elements(*self._shortcut_items_locator)
        self.assertGreater(len(shortcuts), 0, 'No shortcut categories found')

        # Tap on the first category of shortcuts
        self.marionette.tap(shortcuts[0])

        self.wait_for_element_displayed(*self._facebook_icon_locator)

        fb_icon = self.marionette.find_element(*self._facebook_icon_locator)
        self.marionette.tap(fb_icon)

        # Switch to top level frame then we'll look for the Facebook app
        self.marionette.switch_to_frame()

        # Find the frame and switch to it
        fb_iframe = self.wait_for_element_present(*self._facebook_iframe_locator)
        self.marionette.switch_to_frame(fb_iframe)

        fb_title = self.marionette.find_element(*self._facebook_title_locator)
        self.assertIn("Facebook", fb_title.text)
