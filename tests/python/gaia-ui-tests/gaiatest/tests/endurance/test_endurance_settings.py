# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 210 minutes

import time

from gaiatest import GaiaEnduranceTestCase


class TestEnduranceSettings(GaiaEnduranceTestCase):

    settings_list = [
                     {"menu_locator": ('id', 'menuItem-wifi'), "screen_locator": ('css selector', '#wifi-enabled input')},
                     {"menu_locator": ('id', 'menuItem-callSettings'), "screen_locator": ('id', 'menuItem-callWaiting')},
                     {"menu_locator": ('id', 'menuItem-cellularAndData'), "screen_locator": ('id', 'dataConnection-desc')},
                     {"menu_locator": ('id', 'menuItem-bluetooth'), "screen_locator": ('css selector', '#bluetooth-status input')},
                     {"menu_locator": ('id', 'menuItem-internetSharing'), "screen_locator": ('xpath', '//button[@data-l10n-id="hotspotSettings"]')},
                     {"menu_locator": ('id', 'menuItem-sound'), "screen_locator": ('xpath', '//button[@data-l10n-id="change"]')},
                     {"menu_locator": ('id', 'menuItem-display'), "screen_locator": ('css selector', '#display.current')},
                     {"menu_locator": ('id', 'menuItem-notifications'), "screen_locator": ('xpath', '//a[@data-l10n-id="lockscreen-notifications"]')},
                     {"menu_locator": ('id', 'menuItem-dateAndTime'), "screen_locator": ('id', 'dateTime')},
                     {"menu_locator": ('id', 'menuItem-languageAndRegion'), "screen_locator": ('css selector', '#root > header > h1')},
                     {"menu_locator": ('id', 'menuItem-homescreen'), "screen_locator": ('xpath', '//a[@data-l10n-id="homescreen"]')},
                     {"menu_locator": ('id', 'menuItem-keyboard'), "screen_locator": ('xpath', '//a[@data-l10n-id="vibration"]')},
                     {"menu_locator": ('id', 'menuItem-screenLock'), "screen_locator": ('xpath', '//a[@data-l10n-id="lockScreen"]')},
                     {"menu_locator": ('id', 'menuItem-simSecurity'), "screen_locator": ('id', 'simpin-enabled')},
                     {"menu_locator": ('id', 'menuItem-appPermissions'), "screen_locator": ('xpath', '//a[@href="#appPermissions"]')},
                     {"menu_locator": ('id', 'menuItem-doNotTrack'), "screen_locator": ('css selector', '#doNotTrack label')},
                     {"menu_locator": ('id', 'menuItem-applicationStorage'), "screen_locator": ('xpath', '//a[@data-l10n-id="appStorage"]')},
                     {"menu_locator": ('id', 'menuItem-mediaStorage'), "screen_locator": ('id', 'mediaStorage')},
                     {"menu_locator": ('id', 'menuItem-deviceInfo'), "screen_locator": ('css selector', '#about-moreInfo button')},
                     {"menu_locator": ('css selector', 'menuItem-battery'), "screen_locator": ('id', 'model-name')},
                     {"menu_locator": ('id', 'menuItem-improveBrowserOS'), "screen_locator": ('id', 'improveBrowserOS')},
                     {"menu_locator": ('id', 'menuItem-help'), "screen_locator": ('id', 'help')}
                    ]

    _back_button_locator = ('css selector', ".current header > a")

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

    def test_endurance_settings(self):
        self.drive(test=self.settings, app='settings')

    def settings(self):
        # Start settings app, navigate into each of the settings sub-screens,
        # verify all of the screens appear, then close the settings app, repeat

        # Launch settings app
        self.app = self.apps.launch("settings")
        time.sleep(1)

        # Navigate to each screen
        for settings_area in self.settings_list:
            self.verify_settings_screen_exists(settings_area["menu_locator"], settings_area["screen_locator"])

        # Close settings app
        self.close_app()

        # Time between reps
        time.sleep(1)

    def verify_settings_screen_exists(self, settings_menu_locator, settings_screen_locator):
        # Navigate into the given settings screen and verify the screen is displayed
        self.wait_for_element_present(settings_menu_locator[0], settings_menu_locator[1])
        menu_item = self.marionette.find_element(settings_menu_locator[0], settings_menu_locator[1])

        # Need explicit scroll because of bug 833370
        self.marionette.execute_script('arguments[0].scrollIntoView(false);', [menu_item])
        time.sleep(1)
        menu_item.tap()
        time.sleep(2)
        self.wait_for_element_present(settings_screen_locator[0], settings_screen_locator[1])
        self.go_back_to_main_settings()

    def go_back_to_main_settings(self):
        # Go back to main settings screen from a settings sub-screen
        time.sleep(1)
        go_back = self.marionette.find_element(*self._back_button_locator)
        go_back.tap()
        time.sleep(1)
