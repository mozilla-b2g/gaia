# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.marketplace.app import Marketplace
from gaiatest.mocks.persona_test_user import PersonaTestUser


class TestMarketplaceChangeRegionLogin(GaiaTestCase):

    _REGION = 'Spain'

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.connect_to_network()
        self.install_marketplace()

        # generate unverified PersonaTestUser account
        self.user = PersonaTestUser().create_user(verified=True, env={
            "browserid": "firefoxos.persona.org",
            "verifier": "marketplace-dev.allizom.org"})

    def test_marketplace_change_region_login(self):

        marketplace = Marketplace(self.marionette, 'Marketplace Dev')
        marketplace.launch()

        # login to marketplace
        settings = marketplace.login(self.user)

        # change region
        settings.select_region(self._REGION)

        # save changes
        settings.tap_save_changes()

        # wait for the changes to be saved
        marketplace.wait_for_notification_message_displayed()
        self.assertEqual(marketplace.notification_message, 'Settings saved')

        # go to home
        marketplace.tap_back()

        # go back to settings
        settings = marketplace.tap_settings()

        # check if the region is same as changed before
        self.assertEqual(settings.region, self._REGION)
