from gaiatest import GaiaTestCase

from gaiatest.apps.contacts.app import Contacts


class TestImportContactsFromSIM(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

    def test_import_contacts_from_SIM(self):
        """ Insert a new prepaid SIM card (some contacts) in device and import the contacts

        https://moztrap.mozilla.org/manage/case/5880/

        """

        self.assertGreater(len(self.data_layer.sim_contacts), 0, "There is no SIM contacts on SIM card.")
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
