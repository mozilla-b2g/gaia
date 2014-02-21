# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest import GaiaTestCase
from gaiatest.apps.browser.app import Browser
from gaiatest.apps.persona.app import Persona
from gaiatest.mocks.persona_test_user import PersonaTestUser


class TestPersonaCookie(GaiaTestCase):

    _logged_out_button_locator = (By.CSS_SELECTOR, '#signinhere .btn-persona')
    _logged_in_button_locator = (By.ID, 'loggedin')

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_network()

        # Generate unverified PersonaTestUser account
        self.user = PersonaTestUser().create_user(
            verified=True, env={"browserid": "firefoxos.persona.org", "verifier": "firefoxos.123done.org"}
        )

    def test_persona_cookie(self):
        """
        Smoketest of cookie handling/Persona integration
        Log in with Persona user
        After refreshing 123done should still be logged in (cookie retained)
        """
        browser = Browser(self.marionette)
        browser.launch()

        browser.go_to_url('http://firefoxos.123done.org', timeout=120)

        browser.switch_to_content()

        self.wait_for_element_displayed(*self._logged_out_button_locator, timeout=120)

        login_button = self.marionette.find_element(*self._logged_out_button_locator)
        login_button.tap()

        persona = Persona(self.marionette)
        persona.switch_to_persona_frame()
        persona.login(self.user.email, self.user.password)

        # Back to browser content
        browser.switch_to_content()
        self.wait_for_element_displayed(*self._logged_in_button_locator)

        browser.switch_to_chrome()
        # Refresh the page
        browser.tap_go_button()

        # Now we expect B2G to retain the Persona cookie and remain logged in
        browser.switch_to_content()
        self.wait_for_element_displayed(*self._logged_in_button_locator)
