# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.marionette_test import SkipTest
from gaiatest import GaiaTestCase
import time
from gaiatest.apps.contacts.app import Contacts


class TestImportContactsFromFacebook(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        # this test should have facebook information
        try:
            self.testvars['facebook']
        except KeyError:
            raise SkipTest('Facebook account details not present in test variables')
        self.connect_to_network()

    def test_import_contacts_from_facebook(self):
        """ Import contacts from facebook

        https://github.com/mozilla/gaia-ui-tests/issues/344

        """

        username = self.testvars['facebook']['username']
        password = self.testvars['facebook']['password']
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        # Go on Contacts Settings page
        contacts_settings = contacts_app.tap_settings()
        facebook = contacts_settings.tap_sync_friends()

        facebook.switch_to_facebook_login_frame()
        contact_import_picker = facebook.facebook_login(username, password)

        # Import all contacts
        contact_import_picker.tap_select_all()
        contacts_settings = contact_import_picker.tap_import_button()
        contacts_settings.tap_done()

        # Check there is one gmail contact imported
        self.assertEqual(len(contacts_app.contacts), 1)
