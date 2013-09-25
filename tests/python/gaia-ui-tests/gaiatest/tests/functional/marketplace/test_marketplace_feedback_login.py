# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.mocks.persona_test_user import PersonaTestUser


class TestMarketplaceFeedback(GaiaTestCase):
    MARKETPLACE_DEV_NAME = 'Marketplace Dev'
    feedback_submitted_message = u'Feedback submitted. Thanks!'
    test_comment = 'This is a test comment.'

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.install_marketplace()

        self.user = PersonaTestUser().create_user(verified=True,
                                                  env={"browserid": "firefoxos.persona.org", "verifier": "marketplace-dev.allizom.org"})

    def test_marketplace_feedback_user(self):
        # launch marketplace dev and go to marketplace
        self.marketplace = Marketplace(self.marionette, self.MARKETPLACE_DEV_NAME)
        self.marketplace.launch()

        # wait for settings button to come out
        self.marketplace.wait_for_setting_displayed()
        settings = self.marketplace.tap_settings()

        # sign in with persona
        persona = settings.tap_sign_in()
        persona.login(self.user.email, self.user.password)

        # switch back to Marketplace
        self.marionette.switch_to_frame()
        self.marketplace.launch()

        # go to feedback tab
        self.marketplace.select_setting_feedback()

        # enter and submit your feedback
        self.marketplace.enter_feedback(self.test_comment)
        self.marketplace.submit_feedback()

        # catch the notification
        self.marketplace.wait_for_notification_message_displayed()
        message_content = self.marketplace.notification_message

        # verify if the notification is right
        self.assertEqual(message_content, self.feedback_submitted_message)
