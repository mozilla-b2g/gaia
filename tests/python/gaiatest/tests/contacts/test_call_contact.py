# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact

from marionette.errors import NoSuchElementException


class TestContacts(GaiaTestCase):

    _loading_overlay = ('id', 'loading-overlay')

    # Contact details panel
    _contact_name_title = ('id', 'contact-name-title')
    _call_phone_number_button_locator = ('id', 'call-or-pick-0')

    # Call Screen app
    _calling_number_locator = ('xpath', "//section[1]//div[@class='number']")
    _outgoing_call_locator = ('css selector', 'div.direction.outgoing')
    _hangup_bar_locator = ('id', 'callbar-hang-up-action')
    _call_app_locator = ('css selector', "iframe[name='call_screen']")


    def setUp(self):
        GaiaTestCase.setUp(self)

        self.lockscreen.unlock()

        # launch the Contacts app
        self.app = self.apps.launch('Contacts')
        self.wait_for_element_not_displayed(*self._loading_overlay)

        # Seed the contact with the remote phone number so we don't call random people
        self.contact = MockContact(tel={'type':'Mobile','value':"%s" % self.testvars['remote_phone_number']})
        self.data_layer.insert_contact(self.contact)
        self.marionette.refresh()

    def create_contact_locator(self, contact):
        return ('xpath', "//a[descendant::strong[text()='%s']]" % contact)

    def test_call_contact(self):
        # NB This is not a listed smoke test
        # Call phone from a contact

        contact_locator = self.create_contact_locator(self.contact['givenName'])
        self.wait_for_element_displayed(*contact_locator)

        self.marionette.find_element(*contact_locator).click()

        self.wait_for_element_displayed(*self._call_phone_number_button_locator)
        self.marionette.find_element(*self._call_phone_number_button_locator).click()

        # Switch to top level frame
        self.marionette.switch_to_frame()

        # Wait for call screen then switch to it
        self.wait_for_element_present(*self._call_app_locator)
        call_screen = self.marionette.find_element(*self._call_app_locator)
        self.marionette.switch_to_frame(call_screen)

        # Wait for call screen to be dialing
        self.wait_for_element_displayed(*self._outgoing_call_locator)

        # Check the number displayed is the one we dialed
        self.assertEqual(self.contact['tel']['value'],
            self.marionette.find_element(*self._calling_number_locator).text)

        # hang up before the person answers ;)
        self.marionette.find_element(*self._hangup_bar_locator).click()


    def tearDown(self):

        if hasattr(self, 'contact'):
            # Have to switch back to Contacts frame to remove the contact
            self.marionette.switch_to_frame()
            self.marionette.switch_to_frame(self.app.frame_id)
            self.data_layer.remove_contact(self.contact)

        # close all apps
        self.apps.kill_all()
