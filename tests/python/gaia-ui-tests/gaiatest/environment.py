# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


class AttrDict(dict):
    """Dictionary that allows accessing items as if they were attributes."""

    def __getattr__(self, attr):
        return self[attr]


class GaiaTestEnvironment(object):
    """Test environment for Gaia."""

    def __init__(self, testvars):
        self._testvars = testvars

    @property
    def email(self):
        """Dictionary of e-mail protocol settings."""
        return AttrDict(self._testvars.get('email', {}))

    @property
    def host(self):
        """Dictionary of host specific values."""
        return AttrDict(self._testvars.get('host', {}))

    @property
    def imei_numbers(self):
        """List of IMEI numbers associated with the target instance."""
        value = self._testvars.get('imei', [])
        return value if type(value) is list else [value]

    @property
    def phone_numbers(self):
        """List of phone numbers associated with the target instance."""
        value = self._testvars.get('phone_number', [])
        return value if type(value) is list else [value]
