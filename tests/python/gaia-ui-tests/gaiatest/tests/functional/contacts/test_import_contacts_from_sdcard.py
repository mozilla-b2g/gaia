from gaiatest import GaiaTestCase

from gaiatest.apps.contacts.app import Contacts


class TestImportContactsFromSDCard(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # remove existing vcf files from sdcard
        for filename in self.data_layer.sdcard_files('.vcf'):
            self.device.manager.removeFile(filename)

        # add .vcf file to SD card
        self.push_resource('gaia061281_test.vcf')

    def test_import_contacts_from_sdcard(self):
        """ Insert a .vcf file to SD card(containing a contact) and import the contact

        https://bugzilla.mozilla.org/show_bug.cgi?id=927348 -  Write a test to import from VCF file on SD card
        """

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        # import contacts from SIM
        contacts_settings = contacts_app.tap_settings()
        contacts_settings.tap_import_contacts()
        contacts_settings.tap_import_from_sdcard()
        contacts_settings.tap_back_from_import_contacts()
        contacts_settings.tap_done()

        # check that the contact name matches the expected, one from the .vcf file
        self.assertEqual(contacts_app.contacts[0].full_name, 'gaia061281 test')
