#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time


class MockEmail(dict):

    def __init__(self, sender, recipient, **kwargs):
        current_time = time.time()
        self['from'] = sender
        self['to'] = recipient
        self['subject'] = 'Test email subject %s' % current_time
        self['message'] = 'Test email message %s' % current_time
        self.update(**kwargs)

    # allow getting items as if they were attributes
    def __getattr__(self, attr):
        return self[attr]
