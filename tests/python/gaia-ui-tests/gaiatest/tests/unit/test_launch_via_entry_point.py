# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette_driver import Wait


class TestLaunchViaEntryPoint(GaiaTestCase):

    def test_launch_manifest_and_entry_point(self):
        communications_manifest_url = 'app://communications.gaiamobile.org/manifest.webapp'
        entry_point = 'dialer'

        app = self.apps.launch('Communications', manifest_url=communications_manifest_url, entry_point=entry_point)
        self.assertTrue(app.frame)
        Wait(self.marionette).until(lambda m: 'dialer' in m.get_url())
