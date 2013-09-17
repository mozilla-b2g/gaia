# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
import random

from gaiatest import GaiaTestCase
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.mocks.persona_test_user import PersonaTestUser


class TestMarketplaceAddReview(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()
        self.install_marketplace()

        self.user = PersonaTestUser().create_user(verified=True,
                                                  env={"browserid": "firefoxos.persona.org", "verifier": "marketplace-dev.allizom.org"})

    def test_add_review(self):

        marketplace = Marketplace(self.marionette, 'Marketplace dev')
        marketplace.launch()

        # Sign in
        settings = marketplace.tap_settings()
        persona = settings.tap_sign_in()
        persona.login(self.user.email, self.user.password)

        self.marionette.switch_to_frame()
        marketplace.launch()
        settings.wait_for_sign_out_button()

        # Search and select app
        results = marketplace.search('SoundCloud')
        self.assertGreater(len(results.search_results), 0, 'No results found.')
        details_page = results.search_results[0].tap_app()

        # Setting your default values for review
        current_time = str(time.time()).split('.')[0]
        rating = random.randint(1, 5)
        body = 'This is a test %s' % current_time

        # Adding the review
        review_box = details_page.tap_write_review()
        review_box.write_a_review(rating, body)

        marketplace.wait_for_notification_message_displayed()

        # Check if review was added correctly
        self.assertEqual(marketplace.notification_message, "Your review was posted")
        self.assertEqual(details_page.first_review_rating, rating)
        self.assertEqual(details_page.first_review_body, body)
