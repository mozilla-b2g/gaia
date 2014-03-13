# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os

from gaiatest import GaiaTestCase
from gaiatest.apps.ui_tests.app import UiTests
from gaiatest.mocks.persona_test_user import PersonaTestUser
from gaiatest.utils.persona.assertion_util import AssertionUtil

AUDIENCE = os.environ.get("AUDIENCE", "app://uitest.gaiamobile.org")
VERIFIER_URL = os.environ.get("VERIFIER_URL", "https://login.persona.org/verify")
TESTUSER_BROWSERID = os.environ.get("TESTUSER_BROWSERID", "login.persona.org")
TESTUSER_VERIFIER = os.environ.get("TESTUSER_VERIFIER", "login.persona.org")


class TestPersonaStandard(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        # Generate unverified PersonaTestUser account
        self.user = PersonaTestUser().create_user(
            verified=True, env={"browserid": TESTUSER_BROWSERID,
                                "verifier": TESTUSER_VERIFIER}
        )

    def test_persona_standard_sign_in(self):
        """
        Test standard sign in to UI tests app
        """
        uitests = UiTests(self.marionette)
        uitests.launch()
        uitests.tap_api_button()
        moz_id = uitests.tap_moz_id_button()
        moz_id.switch_to_frame()

        persona = moz_id.tap_standard_sign_in()

        persona.login(self.user.email, self.user.password)

        moz_id.switch_to_frame()
        moz_id.wait_for_login_event()
        moz_id.tap_logout_button()
        moz_id.wait_for_logout_event()

        assertion = moz_id.get_assertion()
        assertionUtil = AssertionUtil()
        unpacked = assertionUtil.unpackAssertion(assertion)

        self.assertEqual(AUDIENCE, unpacked['payload']['aud'])
        self.assertEqual(self.user.email, unpacked['claim']['principal']['email'])

        verified = assertionUtil.verifyAssertion(assertion, AUDIENCE, VERIFIER_URL)
        self.assertEqual(verified['status'], 'okay')
        self.assertEqual(verified['email'], self.user.email)
        self.assertEqual(verified['audience'], AUDIENCE)
