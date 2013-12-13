# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase


class TestKill(GaiaTestCase):

    def test_kill(self):
        app = self.apps.launch('Clock')
        self.apps.kill(app)
        self.check_no_apps_running()

    def test_kill_multiple(self):
        running_apps = []

        for app in ['Calendar', 'Clock']:
            running_apps.append(self.apps.launch(app))
            time.sleep(1)

        for app in running_apps:
            self.apps.launch(app.name)
            self.apps.kill(app)

        self.check_no_apps_running()

    def check_no_apps_running(self):
        self.assertEqual(
            [a.name.lower() for a in self.apps.running_apps], ['homescreen'])
