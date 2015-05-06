# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from marionette_driver import Wait


class TestLaunchViaManifest(GaiaTestCase):

    def test_launch_manifest(self):
        browser_manifest_url = 'app://search.gaiamobile.org/manifest.webapp'

        app = self.apps.launch('Browser', manifest_url=browser_manifest_url)
        self.assertTrue(app.frame)
        Wait(self.marionette).until(lambda m: 'search' in m.get_url())
