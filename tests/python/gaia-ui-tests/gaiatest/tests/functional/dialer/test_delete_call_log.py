# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.mocks.mock_call import MockCall


class TestDeleteCallLog(GaiaTestCase):

    def setUp(self):

        GaiaTestCase.setUp(self)

        self.phone = Phone(self.marionette)
        self.phone.launch()

        self.data_layer.insert_call_entry(MockCall())
        self.data_layer.insert_call_entry(MockCall(call_type='dialing'))

    def test_delete_call_log(self):
        """
        https://moztrap.mozilla.org/manage/case/2267/
        """

        call_log = self.phone.tap_call_log_toolbar_button()
        call_log.tap_edit_button()

        # Check that we are in edit mode
        self.assertEqual('Edit', call_log.header_text)

        call_log.tap_select_all_button()
        call_list = call_log.call_list

        # Check that the header contains the number of selected elements
        # and that the checkboxes are selected
        self.assertIn(str(len(call_list)), call_log.header_text)
        for call in call_list:
            self.assertTrue(call.is_checked)

        call_log.tap_delete_button()
        call_log.tap_delete_confirmation_button()

        self.assertEqual('No calls recorded', call_log.no_logs_message)
