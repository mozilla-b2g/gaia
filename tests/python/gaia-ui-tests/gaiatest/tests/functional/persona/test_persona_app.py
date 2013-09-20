# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import os

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.persona.app import Persona
from gaiatest.mocks.persona_test_user import PersonaTestUser

AUDIENCE = os.environ.get("AUDIENCE", "app://uitest.gaiamobile.org")
VERIFIER_URL = os.environ.get("VERIFIER_URL", "https://login.persona.org/verify")
TESTUSER_BROWSERID = os.environ.get("TESTUSER_BROWSERID", "login.persona.org")
TESTUSER_VERIFIER = os.environ.get("TESTUSER_VERIFIER", "login.persona.org")


class TestPersonaStandard(GaiaTestCase):

    _mozId_tests_button_locator = (By.LINK_TEXT, 'navigator.mozId tests')
    _standard_request_button_locator = (By.ID, 't-request')
    _logout_button_locator = (By.ID, 't-logout')

    _app_identity_frame = (By.CSS_SELECTOR, 'iframe[src*="identity"]')
    _app_ready_event = (By.CSS_SELECTOR, 'li.ready')
    _app_login_event = (By.CSS_SELECTOR, 'li.login')
    _app_login_assertion_text = (By.CSS_SELECTOR, 'li.login div.assertion')
    _app_logout_event = (By.CSS_SELECTOR, 'li.logout')

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
        self.app = self.apps.launch('UI tests')

        # click on mozId tests
        persona = Persona(self.marionette)
        persona.wait_for_and_tap(self._mozId_tests_button_locator)
        persona.switch_to_app(self.app.frame, self._app_identity_frame)

        # click on standard persona test
        persona.wait_for_and_tap(self._standard_request_button_locator)
        persona.login(self.user.email, self.user.password)

        # switch to app frame
        persona.switch_to_app(self.app.frame, self._app_identity_frame)
        self.wait_for_element_displayed(*self._app_ready_event)

        # Validate assertion
        assertion = self.marionette.find_element(*self._app_login_assertion_text).text
        unpacked = persona.unpackAssertion(assertion)

        # sanity-check the assertion
        self.assertEqual(AUDIENCE, unpacked['payload']['aud'])
        self.assertEqual(self.user.email, unpacked['claim']['principal']['email'])

        # check with the verifier
        verified = persona.verifyAssertion(assertion, AUDIENCE, VERIFIER_URL)
        self.assertEqual(verified['status'], 'okay')
        self.assertEqual(verified['email'], self.user.email)
        self.assertEqual(verified['audience'], AUDIENCE)

        # Logout so that next run doesn't see old assertions
        persona.wait_for_and_tap(self._logout_button_locator)
        self.wait_for_element_displayed(*self._app_logout_event)
