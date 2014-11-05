from gaiatest import GaiaTestCase

from gaiatest.apps.contacts.app import Contacts
from gaiatest.mocks.mock_contact import MockContact


class TestImportContactsFromSIM(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        if len(self.data_layer.sim_contacts) == 0:
            contact = MockContact()
            self.data_layer.insert_sim_contact(contact)

    def test_import_contacts_from_SIM(self):
        """ Insert a new prepaid SIM card (some contacts) in device and import the contacts

        https://moztrap.mozilla.org/manage/case/5880/

        """

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        # import contacts from SIM
        contacts_settings = contacts_app.tap_settings()
        contacts_settings.tap_import_contacts()
        contacts_settings.tap_import_from_sim()
        contacts_settings.tap_back_from_import_contacts()
        contacts_settings.tap_done()

        # all the contacts in the SIM should be imported
        self.assertEqual(len(contacts_app.contacts), len(self.data_layer.sim_contacts))
