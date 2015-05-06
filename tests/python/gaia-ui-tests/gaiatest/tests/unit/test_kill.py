# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.clock.app import Clock


class TestKill(GaiaTestCase):

    def test_kill(self):
        app = self.apps.launch(Clock.name)
        self.apps.kill(app)
        self.check_no_apps_running()

    def check_no_apps_running(self):
        self.assertEqual([a.name for a in self.apps.running_apps()], [])
