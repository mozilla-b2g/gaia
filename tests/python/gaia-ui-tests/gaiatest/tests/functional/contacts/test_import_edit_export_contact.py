import time
from gaiatest import GaiaTestCase

from gaiatest.apps.contacts.app import Contacts
from gaiatest.mocks.mock_contact import MockContact


class TestImportEditExportContact(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        curr_time = repr(time.time()).replace('.', '')

        self.contact = MockContact(givenName='Name%s'%curr_time[12:], name='Name%s'%curr_time[12:], familyName='')

        self.sim_contact = self.data_layer.insert_sim_contact(self.contact)

    def test_import_edit_export_contact(self):
        """
        https://moztrap.mozilla.org/manage/case/14115/
        """

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()

        sim_contacts_number_before_import = len(self.data_layer.sim_contacts)
        self.apps.switch_to_displayed_app()

        # import contacts from SIM
        contacts_settings = contacts_app.tap_settings()
        contacts_settings.tap_import_contacts()
        contacts_settings.tap_import_from_sim()
        contacts_settings.tap_back_from_import_contacts()
        contacts_settings.tap_done()

        contact_first_name = self.sim_contact['name'][0].split()[0]
        contact_details = contacts_app.contact(contact_first_name).tap()

        edit_contact = contact_details.tap_edit()

        contact_new_family_name = 'New'

        edit_contact.type_family_name(contact_new_family_name)

        contact_details = edit_contact.tap_update()

        contact_details.tap_back()

        contacts_settings = contacts_app.tap_settings()
        contacts_settings.tap_export_contacts()
        contacts_settings.tap_export_to_sim()

        contacts_app.tap_select_all()
        contacts_app.tap_export()

        self.assertIn('contacts exported', contacts_app.status_message)

        sim_contacts = self.data_layer.sim_contacts

        self.assertEqual(len(sim_contacts), sim_contacts_number_before_import)

        for contact in sim_contacts:
            if contact['tel'][0]['value'] == self.sim_contact['tel'][0]['value']:
                self.sim_contact = contact
                break

        self.assertEqual(self.sim_contact['name'][0], '%s %s' % (contact_first_name, contact_new_family_name))
        self.assertEqual(self.sim_contact['tel'][0]['value'], self.contact.tel['value'])

    def tearDown(self):
        self.data_layer.delete_sim_contact(self.sim_contact['id'])

        GaiaTestCase.tearDown(self)
