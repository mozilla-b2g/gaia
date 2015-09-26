#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time, datetime


class MockCall(dict):

    def __init__(self, phone_number=None, call_type='incoming', date=datetime.date.today(), duration=1,
                 status='cancelled', serviceId=0, emergency=False, voicemail=False, **kwargs):
        super(MockCall, self).__init__(self, **kwargs)

        current_time = repr(time.time()).replace('.', '')
        self['number'] = phone_number if phone_number is not None else '555%s' % current_time[-7:]
        self['type'] = call_type
        self['date'] = time.mktime(date.timetuple())*1000
        self['duration'] = duration
        self['serviceId'] = serviceId
        self['status'] = status
        self['emergency'] = emergency
        self['voicemail'] = voicemail

        # update with any keyword arguments passed
        self.update(**kwargs)

    # allow getting items as if they were attributes
    def __getattr__(self, attr):
        return self[attr]
