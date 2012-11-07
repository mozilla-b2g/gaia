# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import time


class TestKillAll(GaiaTestCase):
    def test_kill_all(self):
        # unlock the lockscreen if it's locked
        self.assertTrue(self.lockscreen.unlock())

        # launch the Calculator app
        app = self.apps.launch('Calculator')
        self.assertTrue(app.frame_id is not None)

        # launch the Clock app
        app = self.apps.launch('Clock')
        self.assertTrue(app.frame_id is not None)

        # kill all the apps
        self.apps.killAll()

        # verify no apps are active
        runningApps = self.apps.runningApps()
        for origin in runningApps.keys():
            if 'homescreen' not in origin:
                self.assertTrue(False, "%s still running" % origin)
