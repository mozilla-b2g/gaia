# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait

from gaiatest import GaiaTestCase


class TestColdLaunch(GaiaTestCase):

    def test_cold_launch(self):
        app = self.apps.launch('Clock')
        self.assertTrue(app.frame)
        Wait(self.marionette).until(lambda m: 'clock' in m.get_url())
