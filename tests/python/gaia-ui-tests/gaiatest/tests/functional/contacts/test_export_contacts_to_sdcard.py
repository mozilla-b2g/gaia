from gaiatest import GaiaTestCase
from gaiatest.apps.contacts.app import Contacts
from gaiatest.mocks.mock_contact import MockContact


class TestExportContactsToSDCard(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # insert contact
        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

        # remove vcf files from sdcard
        for filename in self.data_layer.sdcard_files('.vcf'):
            self.device.manager.removeFile(filename)

    def test_export_contacts_to_sdcard(self):
        """ Export contacts to an SD card """

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts()

        contacts_settings = contacts_app.tap_settings()
        contacts_settings.tap_export_contacts()
        contacts_settings.tap_export_to_sd()

        contacts_app.tap_select_all()
        contacts_app.tap_export()

        self.assertIn('1/1 contacts exported', contacts_app.status_message)

        vcf_files = self.data_layer.sdcard_files('.vcf')

        self.assertEqual(1, len(vcf_files))
