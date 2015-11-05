# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import SkipTest
from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages
from gaiatest.apps.system.app import System
from gaiatest.utils.plivo.plivo_util import PlivoUtil


class TestSms(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        try:
            self.testvars['plivo']
        except KeyError:
            raise SkipTest('Plivo account details not present in test variables')

        plivo = PlivoUtil(
            self.testvars['plivo']['auth_id'],
            self.testvars['plivo']['auth_token'],
            self.testvars['plivo']['phone_number']
        )

        plivo.send_sms(to_number=self.environment.phone_numbers[0].replace('+', ''),
                       message=self._generate_text())

        system = System(self.marionette)
        system.wait_for_notification_toaster_displayed(timeout=300)

    def test_delete_threads(self):
        """ https://moztrap.mozilla.org/manage/case/15927/ """

        messages = Messages(self.marionette)
        messages.launch()

        new_message = messages.create_new_message(recipients=[self.environment.phone_numbers[0]],
                                                  message=self._generate_text())
        new_message.save_as_draft()
        self.assertGreaterEqual(len(messages.threads), 2)

        messages.enter_select_mode()
        for thread in messages.threads:
            thread.choose()

        messages.delete_selection()
        self.assertEqual(len(messages.threads), 0)
        self.assertFalse(messages.is_in_select_mode)

    @staticmethod
    def _generate_text():
        import time
        return 'Automated Test {}'.format(time.time())
