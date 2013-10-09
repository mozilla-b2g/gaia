# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import plivo


class Plivo(object):

    def __init__(self, plivo_credentials):
        self.credentials = plivo_credentials
        self.api = plivo.RestAPI(self.credentials['auth_id'],
                                 self.credentials['auth_token'])

    def make_call(self, to_number):
        resp = self.api.make_call({
            'from': self.credentials['phone_number'],
            'to': to_number,
            'answer_url': "http://example.com/answer_url",
            'hangup_url': "http://example.com/hangup_url",
            'caller_name': 'testing_name_xxxxxx',
        })
        assert 201 == resp[0]

        return resp[1]['request_uuid']

    def get_call_uuid_for(self, to_number):
        resp = self.api.get_live_calls()
        assert resp[0] == 200
        calls = resp[1]['calls']

        this_call = None
        for call in calls:
            resp = self.api.get_live_call(params=dict(call_uuid=call))
            assert resp[0] == 200
            if resp[1]['to'] == to_number:
                this_call = call
                break
        else:
            raise Exception('Unable to find the live call for this device.')

        return this_call

    def is_call_live(self, call_uuid):
        resp = self.api.get_live_call(params=dict(call_uuid=call_uuid))
        if resp[0] == 200:
            return True
        return False

    def hangup_call(self, call_uuid=None, request_uuid=None):
        if call_uuid is not None:
            resp = self.api.hangup_call({
                'call_uuid': call_uuid,
            })

        if request_uuid is not None:
            resp = self.api.hangup_request({
                'request_uuid': request_uuid,
            })

        return resp
