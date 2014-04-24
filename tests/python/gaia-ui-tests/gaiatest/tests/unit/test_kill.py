# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase


class TestKill(GaiaTestCase):

    def test_kill(self):
        app_name = 'Clock'
        app = self.apps.launch(app_name)
        self.apps.kill(app)
        self.assertNotIn(app_name, [a.name.lower() for a in self.apps.running_apps])

    def test_kill_multiple(self):

        apps = ['Calendar', 'Clock']
        running_apps = []

        for app in apps:
            running_apps.append(self.apps.launch(app))
            time.sleep(1)

        for app in running_apps:
            self.apps.launch(app.name)
            time.sleep(1)
            self.apps.kill(app)
            time.sleep(1)

        self.assertNotIn(apps, [a.name.lower() for a in self.apps.running_apps])
