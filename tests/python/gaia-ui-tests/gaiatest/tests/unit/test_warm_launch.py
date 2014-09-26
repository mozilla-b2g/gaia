# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestWarmLaunch(GaiaTestCase):

    def test_warm_launch(self):
        cold = self.apps.launch('Cost Control')
        self.marionette.execute_script('return window.location += "datausage-tab"')
        self.apps.launch('Calendar')
        warm = self.apps.launch('Cost Control')
        self.assertEqual(cold, warm)
        self.assertTrue('costcontrol' in self.marionette.get_url())
