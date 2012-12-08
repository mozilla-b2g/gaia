# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestMarketplaceLogin(GaiaTestCase):

    _login_button = ('css selector', 'a.button.browserid')
    _persona_frame = ('css selector', "iframe[name='__persona_dialog']")
    _search_result = ('css selector', '#search-results li.item')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

        self.data_layer.enable_wifi()
        self.data_layer.connect_to_wifi(self.testvars['wifi'])

        # launch the app
        self.app = self.apps.launch('Marketplace')

    def test_login_marketplace(self):
        # https://moztrap.mozilla.org/manage/case/4134/

        self.wait_for_element_displayed(*self._login_button)
        self.marionette.find_element(*self._login_button).click()

        # switch to top level frame
        self.marionette.switch_to_frame()

        #switch to persona frame

        self.wait_for_element_present(*self._persona_frame)
        #persona_frame = self.marionette.find_element(*self._persona_frame)
        #self.marionette.switch_to_frame(persona_frame)

        #TODO switch to Persona frame and wait for throbber to clear

        #TODO complete Persona login
        #self.testvars['marketplace_username']
        #self.testvars['marketplace_password']
        #TODO Switch back to marketplace and verify that user is logged in

    def tearDown(self):

        # close the app
        if self.app:
            self.apps.kill(self.app)

        self.data_layer.disable_wifi()
        GaiaTestCase.tearDown(self)
