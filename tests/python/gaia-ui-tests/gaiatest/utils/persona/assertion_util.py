#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import base64
import json
import requests


class AssertionUtil():

    # Persona verify assertion utils
    def verifyAssertion(self, assertion, AUDIENCE, VERIFIER_URL, **params):
        data = {'assertion': assertion, 'audience': AUDIENCE}
        data.update(params)

        return requests.post(VERIFIER_URL, data=data).json()

    def decodeB64(self, b64input):
        """
        Add padding to b64input if necessary. I think python's base64
        implementation is broken and this should not be necessary.
        """
        out = b64input.strip()
        lastBytesLen = len(out) % 4
        if lastBytesLen == 0:
            pass
        elif lastBytesLen == 3:
            out += '='
        elif lastBytesLen == 2:
            out += '=='
        else:
            print out, lastBytesLen
            raise Exception("Bad base64 input; last group contained weird number of bytes.")

        return base64.b64decode(out)

    def decode(self, encoded):
        return json.loads(self.decodeB64(encoded))

    def unpackAssertion(self, assertion):
        # ignore signatures; we're not a verifier
        header, claim, _, payload, _ = assertion.split('.');
        return {"header": self.decode(header),
                "claim": self.decode(claim),
                "payload": self.decode(payload)}