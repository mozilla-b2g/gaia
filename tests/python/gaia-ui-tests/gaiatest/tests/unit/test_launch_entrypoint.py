# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestLaunchEntrypoint(GaiaTestCase):

    """ Special test because it verifies we can open apps
        that use entrypoints to define apps within one manifest.
        Contacts & Dailer are two examples of those kinds of apps
        within gaia itself.
    """

    def test_launch_entrypoint(self):
        # Launch contacts
        app = self.apps.launch('Clock')
        self.assertTrue(app.frame)

        url = self.marionette.get_url()

        # sanity check we launched the right app.
        # (note we use /contacts to verify this is an entry point launch)
        self.assertTrue('clock' in url, 'wrong url: %s' % url)

        # close the app
        self.apps.kill(app)
