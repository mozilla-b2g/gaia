# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from gaiatest import GaiaTestCase
from gaiatest.apps.phone.regions.call_screen import CallScreen
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
            encoded_string = base64.b64encode(f.read())

        self.contact = MockContact()
        self.contact.update(photo='%s' % encoded_string,
                            tel={'type': 'Mobile', 'value': self.testvars['plivo']['phone_number']})
        self.data_layer.insert_contact(self.contact)

    def test_dialer_receive_call_with_contact_photo(self):
        """
        https://moztrap.mozilla.org/manage/case/1544/
        """
        from gaiatest.utils.plivo.plivo_util import PlivoUtil
        self.plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )
        self.call_uuid = self.plivo.make_call(
            to_number=self.environment.phone_numbers[0].replace('+', ''))

        call_screen = CallScreen(self.marionette)
        call_screen.wait_for_incoming_call()
        self.assertIn('background-image:', call_screen.contact_background_style)

    def tearDown(self):
        self.plivo.hangup_call(self.call_uuid)
        GaiaTestCase.tearDown(self)
