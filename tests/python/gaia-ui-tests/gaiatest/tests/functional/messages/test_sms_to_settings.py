# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSettingsFromMessage(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_settings_from_message(self):
        
        #launch the app
        messages = Messages(self.marionette)
        messages.launch()
        
        #click new message 
        new_message = messages.tap_create_new_message()
        
        #tap options icon
        activities = new_message.tap_options()
        
        #tap settings icon
        messaging_settings = activities.tap_settings()
        
        self.assertTrue(messaging_settings.is_messaging_settings_displayed())
