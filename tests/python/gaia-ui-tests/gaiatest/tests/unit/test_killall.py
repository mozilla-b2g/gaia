# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from gaiatest import GaiaTestCase


class TestKillAll(GaiaTestCase):

    def test_kill_all(self):
        apps = ['Calendar', 'Clock']
        for app in apps:
            self.apps.launch(app)
            time.sleep(1)
        self.apps.kill_all()
        self.assertNotIn(apps, [a.name.lower() for a in self.apps.running_apps])

    def test_kill_all_with_no_apps_running(self):
        apps = [a.name.lower() for a in self.apps.running_apps]
        self.apps.kill_all()
        self.assertEqual(apps, [a.name.lower() for a in self.apps.running_apps])

    def test_kill_all_twice(self):
        apps = ['Calendar', 'Clock']
        for app in apps:
            self.apps.launch(app)
            time.sleep(1)

        self.apps.kill_all()
        self.assertNotIn(apps, [a.name.lower() for a in self.apps.running_apps])

        for app in apps:
            self.apps.launch(app)
            time.sleep(1)

        self.apps.kill_all()
        self.assertNotIn(apps, [a.name.lower() for a in self.apps.running_apps])
