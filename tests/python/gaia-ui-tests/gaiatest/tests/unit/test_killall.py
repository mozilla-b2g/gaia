# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase


class TestKillAll(GaiaTestCase):

    def test_kill_all(self):
        for app in ['Calendar', 'Clock']:
            self.apps.launch(app)
            time.sleep(1)

        self.apps.kill_all()
        self.check_no_apps_running()

    def test_kill_all_with_no_apps_running(self):
        self.check_no_apps_running()
        self.apps.kill_all()
        self.check_no_apps_running()

    def test_kill_all_twice(self):
        apps = ['Calendar', 'Clock']
        for app in apps:
            self.apps.launch(app)
            time.sleep(1)

        self.apps.kill_all()
        self.check_no_apps_running()

        for app in apps:
            self.apps.launch(app)
            time.sleep(1)

        self.apps.kill_all()

    def check_no_apps_running(self):
        self.assertEqual(
            [a.name.lower() for a in self.apps.running_apps], ['homescreen'])
