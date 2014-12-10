# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.mocks.mock_contact import MockContact
import base64


class TestReceiveCallWithContactPhoto(GaiaTestCase):

    def setUp(self):
        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')
        GaiaTestCase.setUp(self)

        with open(self.resource('IMG_0001.jpg'), 'rb') as f:
            in_call_contact_encoded_string = base64.b64encode(f.read())

        self.in_call_contact = MockContact()
        self.in_call_contact.update(photo='%s' % in_call_contact_encoded_string,
                                    tel={'type': 'Mobile', 'value': self.testvars['remote_phone_number']})
        self.data_layer.insert_contact(self.in_call_contact)

        with open(self.resource('image_formats/01.jpg'), 'rb') as f:
            incoming_contact_encoded_string = base64.b64encode(f.read())

        self.incoming_contact = MockContact()
        self.incoming_contact.update(photo='%s' % incoming_contact_encoded_string,
                                     tel={'type': 'Mobile', 'value': self.testvars['plivo']['phone_number']})
        self.data_layer.insert_contact(self.incoming_contact)

    def test_dialer_contact_s_photo_when_having_an_active_call_and_receiving_a_new_incoming_call(self):
        """
        From bug 1009596

        Establish a call with contact A
        Having an active call with contact A, receive an incoming call from contact B
        The photo corresponding to contact A should be shown while receiving the incoming call from contact B
        """
        PLIVO_TIMEOUT = 30

        phone = Phone(self.marionette)
        phone.launch()
        call_screen = phone.keypad.call_number(self.in_call_contact['tel']['value'])
        call_screen.wait_for_outgoing_call()

        in_call_contact_background_style = call_screen.contact_background_style
        self.assertIn('background-image:', in_call_contact_background_style)

        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )
        self.call_uuid = self.plivo.make_call(
            to_number=self.testvars['local_phone_numbers'][0].replace('+', ''),
            timeout=PLIVO_TIMEOUT)

        call_screen.wait_for_incoming_call_while_on_call()

        # The photo corresponding to contact A should be shown while receiving the incoming call from contact B
        self.assertIn('background-image:', call_screen.contact_background_style)
        self.assertEquals(in_call_contact_background_style, call_screen.contact_background_style)

    def tearDown(self):
        self.data_layer.kill_active_call()
        if self.call_uuid is not None:
            self.plivo.hangup_call(self.call_uuid)
        GaiaTestCase.tearDown(self)
