# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestKillAll(GaiaTestCase):

    def test_kill_all(self):
        self.lockscreen.unlock()

        for app in ['Calculator', 'Clock']:
            self.apps.launch(app)

        self.apps.kill_all()
        self.check_no_apps_running()

    def test_kill_all_with_no_apps_running(self):
        self.lockscreen.unlock()
        self.check_no_apps_running()
        self.apps.kill_all()
        self.check_no_apps_running()

    def test_kill_all_twice(self):
        self.lockscreen.unlock()

        apps = ['Calculator', 'Clock']
        for app in apps:
            self.apps.launch(app)

        self.apps.kill_all()
        self.check_no_apps_running()

        for app in apps:
            self.apps.launch(app)

        self.apps.kill_all()

    def check_no_apps_running(self):
        runningApps = self.apps.runningApps()
        for origin in runningApps.keys():
            if 'homescreen' not in origin:
                self.fail('%s still running' % origin)
