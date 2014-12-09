#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from datetime import date


class MockCall(dict):

    def __init__(self, phone_number=None, call_type='incoming', date=date.today(), duration=1, serviceId=0, **kwargs):
        super(MockCall, self).__init__(self, **kwargs)

        current_time = repr(time.time()).replace('.', '')
        self['number'] = phone_number if phone_number is not None else '555%s' % current_time[-7:]
        self['type'] = call_type
        self['date'] = '{:%m/%d/%Y}'.format(date)
        self['duration'] = duration
        self['serviceId'] = serviceId

        # update with any keyword arguments passed
        self.update(**kwargs)

    # allow getting items as if they were attributes
    def __getattr__(self, attr):
        return self[attr]
