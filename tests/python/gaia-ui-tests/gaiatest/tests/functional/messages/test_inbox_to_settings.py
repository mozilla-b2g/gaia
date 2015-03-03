# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSettingsFromInbox(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_settings_from_inbox(self):
        
        #launch the app
        messages = Messages(self.marionette)
        messages.launch()
        
        #tap settings icon
        messaging_settings = messages.tap_settings()
        
        self.assertTrue(messaging_settings.is_messaging_settings_displayed())
