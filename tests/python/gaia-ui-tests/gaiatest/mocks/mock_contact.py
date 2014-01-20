#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time


class MockContact(dict):
    '''
    Mocks a contact conforming to the Mozilla contacts API as a dictionary
    of contact properties.

    Object properties containing sub-properties are themselves dictionaries.

    Properties containing multiple values should be lists, but single instances
    of a property are not required to be lists for convenience.

    The properites created by default are: givenName, familyName, name, email,
    tel, adr, note.
    '''

    def __init__(self, **kwargs):
        super(MockContact, self).__init__(self, **kwargs)

        # Set default values
        curr_time = repr(time.time()).replace('.', '')
        self['givenName'] = 'gaia%s' % curr_time[10:]
        self['familyName'] = 'test'
        self['name'] = '%s %s' % (self['givenName'], self['familyName'])
        self['email'] = {
            'type': 'Personal',
            'value': '%s@restmail.net' % self['givenName']}
        self['tel'] = {
            'type': 'Mobile',
            'value': '555%s' % curr_time[8:]}
        self['adr'] = {
            'type': 'Home',
            'streetAddress': '101 Testing street',
            'postalCode': '90210',
            'locality': 'London',
            'countryName': 'UK'}
        self['note'] = 'Gaia automated test'

        # Update with any keyword arguments passed. Note that the __init__ call
        # above does not call update and so it must be done seperately
        self.update(**kwargs)

    # Allow getting items as if they were attributes
    def __getattr__(self, attr):
        return self[attr]

    def create_mozcontact(self):
        """
        Returns the MockContact dictionary in a format compatible with the
        MozContact API.

        To be compatible with the MozContact API all properties are converted
        to arrays (lists in Python) where required. Note that for object
        properties with sub-properties (ex: the 'tel' property), only the
        'type' sub-property must be an array.
        """
        mozcontact = {}
        for key in self.iterkeys():
            # Handle a MockContact property already in mozcontact format
            if self.is_mozcontact_api_format(self[key]):
                mozcontact[key] = self[key]
            else:
                # All mozcontact properties must be arrays (lists in Python)
                if not isinstance(self[key], list):
                    mozcontact[key] = [self[key]]
                else:
                    mozcontact[key] = self[key]
                # A property that is a dictionary represents an object with
                # sub-properties. Create mozcontact compliant objects.
                if isinstance(mozcontact[key][0], dict):
                    mozcontact[key] = [self._create_mozcontact_object(obj)
                                       for obj in mozcontact[key]]
        return mozcontact

    @staticmethod
    def is_mozcontact_api_format(prop):
        """
        Determines if a property is compliant with the MozContact API.
        """
        # All mozcontact properties must be arrays (lists in Python)
        if not isinstance(prop, list):
            return False
        # Search for any object properties with sub-properties to verify
        for obj in prop:
            # A property that is a dictionary represents an object with
            # sub-properties.
            if isinstance(obj, dict):
                for key in obj.iterkeys():
                    # Only an object's type property should be a list
                    if key == 'type' and not isinstance(obj[key], list):
                        return False
                    elif key != 'type' and isinstance(obj[key], list):
                        return False
        return True

    @staticmethod
    def _create_mozcontact_object(obj):
        """
        Returns a MockContact object property (dictionary) compatible with the
        MozContact API.
        """
        mozobj = obj.copy()
        # Only an object's type property needs to be a list
        if 'type' in mozobj.keys() and not isinstance(mozobj['type'], list):
            mozobj['type'] = [mozobj['type']]
        return mozobj
