# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.sleep_view import SleepScreen

MENU_ITEMS_HAS_MOBILE = ["Turn on airplane mode", "Ring incoming calls", "Restart", "Power off"]
MENU_ITEMS_NO_MOBILE = ["Turn on airplane mode", "Restart", "Power off"]


class TestPowerButton(GaiaTestCase):

    def test_power_button_long_press(self):
        """ Verify Power Button long press menu
        https://moztrap.mozilla.org/manage/case/1330/
        """
        sleep_menu = SleepScreen(self.marionette)

        self.device.hold_sleep_button()
        sleep_menu.wait_for_sleep_menu_visible()

        self.assertEqual(sleep_menu.title, "Phone")

        sleep_menu_items = [item.name for item in sleep_menu.menu_items]
        if self.device.has_mobile_connection:
            for item in MENU_ITEMS_HAS_MOBILE:
                self.assertIn(item, sleep_menu_items)
        else:
            for item in MENU_ITEMS_NO_MOBILE:
                self.assertIn(item, sleep_menu_items)

        sleep_menu.tap_cancel_button()

        self.assertFalse(sleep_menu.is_menu_visible)

