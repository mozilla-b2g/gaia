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
        settings = activities.tap_settings()

        self.wait_for_condition(lambda m: self.apps.displayed_app.name == settings.name)
        self.apps.switch_to_displayed_app()
        from gaiatest.apps.messages.regions.messaging_settings import MessagingSettings
        messaging_settings = MessagingSettings(self.marionette)
        self.assertTrue(messaging_settings.is_messaging_settings_displayed())
