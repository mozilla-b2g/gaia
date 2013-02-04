# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact


class TestContacts(GaiaTestCase):

    def test_and_remove_contact(self):
        self.data_layer.insert_contact(MockContact())
        self.assertEqual(len(self.data_layer.all_contacts), 1)
        self.data_layer.remove_all_contacts()
        self.assertEqual(self.data_layer.all_contacts, [])
