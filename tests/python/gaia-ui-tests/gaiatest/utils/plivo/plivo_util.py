# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import Wait
import plivo


class PlivoUtil(object):

    DEFAULT_TIMEOUT = 30

    def __init__(self, auth_id, auth_token, plivo_phone_number):
        self.api = plivo.RestAPI(auth_id, auth_token)
        self.from_number = plivo_phone_number

    @property
    def account_balance(self):
        return float(self.account_details['cash_credits'])

    @property
    def account_details(self):
        """Get the details for the account"""
        response = self.api.get_account()
        if response[0] == 200:
            return response[1]
        raise self.PlivoError('get_account', response)

    def make_call(self, to_number, timeout=DEFAULT_TIMEOUT):
        """Place a call to a number and wait for the call_uuid to be available
            Return the call_uuid
        """
        # Check that we have the balance available
        if self.account_balance < 0.1:
            raise Exception(
                'Plivo account balance of %s is insufficient to make a call.'
                % self.account_balance)
        # Make the call
        Wait(self.api, timeout).until(
            lambda p: p.make_call({
                'from': self.from_number,
                'to': to_number,
                'answer_url': "http://example.com/answer_url",
                'hangup_url': "http://example.com/hangup_url",
                'caller_name': 'test_call_from_Plivo',
            })[0] == 201,
            message='The call was not able to be made.'
        )
        # Wait until the call is reported back by the api
        call = Wait(self, timeout, ignored_exceptions=self.PlivoActiveCallNotFound).until(
            lambda p: p.get_call_for_number(to_number),
            message='Unable to find the live call for this device.'
        )
        return call['call_uuid']

    def wait_for_call_connected(self, call_uuid, timeout=DEFAULT_TIMEOUT):
        Wait(self, timeout).until(
            lambda p: p.is_call_connected(call_uuid),
            message="Plivo didn't report the call as connected.")

    def wait_for_call_completed(self, call_uuid, timeout=DEFAULT_TIMEOUT):
        Wait(self, timeout).until(
            lambda p: p.is_call_completed(call_uuid),
            message="Plivo didn't report the call as completed")

    def get_call_for_number(self, to_number):
        # We cannot get details directly for a number,
        # so we need to get all live calls and look for the number
        response = self.api.get_live_calls()
        if response[0] != 200:
            raise self.PlivoError('get_live_calls', response)
        calls = response[1]['calls']

        for call in calls:
            response = self.api.get_live_call({'call_uuid': call})
            # Sometimes a call_uuid is present in get_live_calls() but Plivo is not fast enough to
            # immediately create the corresponding endpoint (see bug 1113154)
            if response[0] == 404:
                raise self.PlivoActiveCallNotFound
            if response[0] != 200:
                raise self.PlivoError('get_live_call', response)
            if str(response[1]['to']) == str(to_number):
                return response[1]
        raise self.PlivoActiveCallNotFound

    def is_call_connected(self, call_uuid):
        response = self.api.get_live_call({'call_uuid': call_uuid})
        if response[0] != 200:
            raise self.PlivoError('get_live_call', response)
        return response[1]['call_status'] == 'in-progress'

    def is_call_completed(self, call_uuid):
        response = self.api.get_cdr({'call_uuid': call_uuid})
        if response[0] == 200:
            return True
        if response[0] == 404:
            return False
        raise self.PlivoError('get_cdr', response)

    def hangup_call(self, call_uuid):
        response = self.api.hangup_call({'call_uuid': call_uuid})
        if response[0] not in (204, 404):
            raise self.PlivoError('hangup_call', response)

    class PlivoError(Exception):
        def __init__(self, method, response):
            message = 'Plivo API method %s failed with status: %s, details: %s' \
                           % (method, response[0], response[1])
            Exception.__init__(self, message)

    class PlivoActiveCallNotFound(Exception):
        def __init__(self):
            Exception.__init__(self,
                               'No active call for the specified number can be found by Plivo.')
