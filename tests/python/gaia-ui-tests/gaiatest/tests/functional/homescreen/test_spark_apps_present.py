# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.homescreen.app import Homescreen


class TestSparkAppsArePresent(GaiaTestCase):

    def test_spark_apps_are_present(self):
        homescreen = Homescreen(self.marionette)
        self.apps.switch_to_displayed_app()
        for expected_app in ('Customizer', 'Hackerplace', 'Studio', 'Sharing', 'Webmaker', 'Bugzilla Lite', 'Facebook',
                             'Twitter', 'RunWhatsApp (Preview)', 'BuddyUp', 'Notes', 'Calculator', 'SWOOOP',
                             'Firesea IRC'):
            homescreen.wait_for_app_icon_present(expected_app)
