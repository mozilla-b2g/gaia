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
        # unlock the lockscreen if it's locked
        self.assertTrue(self.lockscreen.unlock())

        # Launch contacts
        app = self.apps.launch('Contacts')
        self.assertTrue(app.frame_id is not None)

        self.marionette.switch_to_frame(app.frame_id)
        url = self.marionette.get_url()

        # sanity check we launched the right app.
        # (note we use /contacts to verify this is an entry point launch)
        self.assertTrue('/contacts' in url, 'wrong url: %s' % url)

        # close the app
        self.apps.kill(app);
