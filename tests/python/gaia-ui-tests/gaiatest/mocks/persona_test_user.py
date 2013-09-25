#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import urllib2
import json
from gaiatest.mocks.mock_user import MockUser


class PersonaTestUser:
    """
    A base test class that can be extended by other tests to include utility methods.
    API docs: https://github.com/mozilla/personatestuser.org#api

    Usage:
    verified = bool:
    Verified refers to the user's account and password already approved and set up

    env = str:
    Strings "dev", "stage" or "prod" will return users for the respective environments
    If "None" a production Persona user will be returned.

    env = dict:
    For custom browserid databases and verifiers
    self.user = PersonaTestUser().create_user(verified=True,
        env={"browserid":"firefoxos.persona.org", "verifier":"firefoxos.123done.org"})

    """

    def create_user(self, verified=False, env=None):

        if verified:
            url = "http://personatestuser.org/email/"
        else:
            url = "http://personatestuser.org/unverified_email/"

        if type(env) is str:
            url += env

        elif type(env) is dict:
            url += "custom?"
            for index, i in enumerate(env):
                if index > 0:
                    url += "&"
                url += "%s=%s" % (i, env[i])

        try:
            # ptu.org will fail with a 400 if the parameters are invalid
            response = urllib2.urlopen(url)
        except urllib2.URLError as e:
            raise Exception("Could not get Persona user from personatestuser.org: %s" % e.reason)

        decode = json.loads(response.read())
        return MockUser(email=decode['email'], password=decode['pass'], name=decode['email'].split('@')[0])
