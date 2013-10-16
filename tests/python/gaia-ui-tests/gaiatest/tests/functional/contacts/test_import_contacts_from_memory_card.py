from gaiatest import GaiaTestCase

from gaiatest.apps.contacts.app import Contacts


class TestImportContactsFromMemoryCard(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # add .vcf file to SD card
        self.push_resource('gaia061281_test.vcf')

    def test_import_contacts_from_memory_card(self):
        """ Insert a vcf file to SD card(containing a contact) and import the contact

        https://bugzilla.mozilla.org/show_bug.cgi?id=927348 -  Write a test to import from VCF file on SD card
        """

        self.assertGreater(len(self.data_layer.sim_contacts), 0, "There is no SIM contacts on SIM card.")
        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        # import contacts from SIM
        contacts_settings = contacts_app.tap_settings()
        contacts_settings.tap_import_contacts()
        contacts_settings.tap_import_from_memory_card()

        # all the contacts in the SIM should be imported
        self.assertEqual(len(contacts_app.contacts), 1)
