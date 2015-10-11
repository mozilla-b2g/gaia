# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.phone.app import Phone
from gaiatest.mocks.mock_call import MockCall

import time
from datetime import date


class TestCallLogGroups(GaiaTestCase):

    def setUp(self):

        GaiaTestCase.setUp(self)

        self.phone = Phone(self.marionette)
        self.phone.launch()

        current_time = repr(time.time()).replace('.', '')
        self.phone_number_1 = '555%s' % current_time[-7:]
        self.phone_number_2 = '444%s' % current_time[-7:]

        self.yesterday_date = date.fromordinal(date.today().toordinal()-1)
        self.past_date_1 = date(2014, 12, 01)
        self.past_date_2 = date(2013, 12, 01)

        self.data_layer.insert_call_entry(MockCall(phone_number=self.phone_number_1))
        self.data_layer.insert_call_entry(MockCall(phone_number=self.phone_number_2))

        self.data_layer.insert_call_entry(MockCall(phone_number=self.phone_number_1, date=self.yesterday_date))

        self.data_layer.insert_call_entry(MockCall(phone_number=self.phone_number_1, date=self.past_date_1))
        self.data_layer.insert_call_entry(MockCall(phone_number=self.phone_number_2, date=self.past_date_1))
        self.data_layer.insert_call_entry(MockCall(phone_number=self.phone_number_2, date=self.past_date_1))

        self.data_layer.insert_call_entry(MockCall(phone_number=self.phone_number_1, date=self.past_date_2))

    def test_call_log_groups(self):
        """
        https://moztrap.mozilla.org/manage/case/2103/
        """

        call_log = self.phone.tap_call_log_toolbar_button()
        group_calls = call_log.groups_list

        self.assertEqual(4, len(group_calls))
        self.assertEqual('TODAY', group_calls[0].header_text)
        self.assertEqual('YESTERDAY', group_calls[1].header_text)
        self.assertEqual(u'{:%m/%d/%y}'.format(self.past_date_1), group_calls[2].header_text)
        self.assertEqual(u'{:%m/%d/%y}'.format(self.past_date_2), group_calls[3].header_text)

        today_group_calls = group_calls[0].group_calls
        yesterday_group_calls = group_calls[1].group_calls
        group_calls_2014 = group_calls[2].group_calls
        group_calls_2013 = group_calls[3].group_calls

        self.assertEqual(2, len(today_group_calls))
        self.assertEqual(self.phone_number_1, today_group_calls[0].phone_number)
        self.assertEqual(self.phone_number_2, today_group_calls[1].phone_number)

        self.assertEqual(1, len(yesterday_group_calls))
        self.assertEqual(self.phone_number_1, yesterday_group_calls[0].phone_number)

        self.assertEqual(2, len(group_calls_2014))
        self.assertEqual(self.phone_number_1, group_calls_2014[0].phone_number)
        self.assertEqual(self.phone_number_2, group_calls_2014[1].phone_number)
        self.assertEqual('2', group_calls_2014[1].retry_count)

        self.assertEqual(1, len(group_calls_2013))
        self.assertEqual(self.phone_number_1, group_calls_2013[0].phone_number)
