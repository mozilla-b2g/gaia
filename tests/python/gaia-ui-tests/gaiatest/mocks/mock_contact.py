#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json


class MockContact(dict):
    '''
    The key values here match the data structure in the contacts db
    so that the json output of this mock can be inserted directly into db
    '''

    def __init__(self, **kwargs):
        # set your default values
        import time
        curr_time = repr(time.time()).replace('.', '')
        self['givenName'] = ['gaia%s' % curr_time[10:]]
        self['familyName'] = ['test']
        self['name'] = [self['givenName'][0] + " " + self['familyName'][0]]
        self['email'] = [{
            'type': ['Personal'],
            'value': '%s@restmail.net' % self['givenName'][0]}]
        # TODO this will only support one phone number
        self['tel'] = [{
            'type': ['Mobile'],
            'value': '555%s' % curr_time[8:]}]
        self['adr'] = [{
            'type': ['Home'],
            'streetAddress': '101 Testing street',
            'postalCode': '90210',
            'locality': 'London',
            'countryName': 'UK'}]
        self['note'] = ["Gaia automated test"]

        # update with any keyword arguments passed
        self.update(**kwargs)

    # allow getting items as if they were attributes
    def __getattr__(self, attr):
        return self[attr]
