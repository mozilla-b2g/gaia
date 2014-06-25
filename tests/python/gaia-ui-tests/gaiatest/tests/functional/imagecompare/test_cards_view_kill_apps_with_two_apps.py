# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase
from gaiatest.apps.system.regions.cards_view import CardsView
from gaiatest.utils.Imagecompare.imagecompare_util import ImageCompareUtil
import sys

class TestCardsViewTwoApps(GaiaTestCase):

    _test_apps = ["Contacts", "Gallery"]

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.cards_view = CardsView(self.marionette)

        current_module = str(sys.modules[__name__])
        self.module_name = current_module[current_module.find("'")+1:current_module.find("' from")]
        self.graphics = ImageCompareUtil(self.marionette,self.apps, self,'.')

        # Launch the test apps
        for app in self._test_apps:
            self.apps.launch(app)
            # Let's wait a bit for the app to fully launch
            time.sleep(2)

    def test_kill_app_from_cards_view(self):
        """https://moztrap.mozilla.org/manage/case/1917/"""

        # Pull up the cards view
        self.device.hold_home_button()
        self.cards_view.wait_for_cards_view()

        # Wait for first app ready
        self.cards_view.wait_for_card_ready(self._test_apps[1])
        self.graphics.invoke_screen_capture()

        # Close the current apps from the cards view
        self.cards_view.close_app(self._test_apps[1])
        self.graphics.invoke_screen_capture()
        self.cards_view.close_app(self._test_apps[0])
        self.graphics.invoke_screen_capture()

        # If successfully killed, the apps should no longer appear in the cards view and the "No recent apps" message should be displayed
        self.assertFalse(self.cards_view.is_app_present(self._test_apps[1]),
                         "Killed app not expected to appear in cards view")

        self.assertFalse(self.cards_view.is_app_present(self._test_apps[0]),
                         "Killed app not expected to appear in cards view")

    def tearDown(self):

        # In case the assertion fails this will still kill the call
        # An open call creates problems for future tests
        self.graphics.execute_image_job()

        GaiaTestCase.tearDown(self)