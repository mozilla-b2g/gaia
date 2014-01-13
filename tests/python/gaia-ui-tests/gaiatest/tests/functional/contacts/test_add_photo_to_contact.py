# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.mocks.mock_contact import MockContact
from gaiatest.apps.contacts.app import Contacts


class TestContacts(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        self.contact = MockContact()
        self.data_layer.insert_contact(self.contact)

        # add photo to storage
        self.push_resource('IMG_0001.jpg', destination='DCIM/100MZLLA')

    def test_add_photo_from_gallery_to_contact(self):
        # https://moztrap.mozilla.org/manage/case/5551/

        contacts_app = Contacts(self.marionette)
        contacts_app.launch()
        contacts_app.wait_for_contacts()

        contact_details = contacts_app.contact(self.contact['givenName'][0]).tap()

        full_name = ' '.join([self.contact['givenName'][0], self.contact['familyName'][0]])

        self.assertEqual(full_name, contact_details.full_name)

        saved_contact_image_style = contact_details.image_style

        edit_contact = contact_details.tap_edit()

        saved_picture_style = edit_contact.picture_style

        activities_list = edit_contact.tap_picture()

        # choose the source as gallery app
        gallery = activities_list.tap_gallery()

        gallery.wait_for_thumbnails_to_load()
        self.assertGreater(gallery.gallery_items_number, 0, 'No photos were found in the gallery.')

        image = gallery.tap_first_gallery_item()
        image.tap_crop_done()

        # fall back to the contacts app
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == contacts_app.name)
        self.apps.switch_to_displayed_app()

        edit_contact.wait_for_image_to_load()

        new_picture_style = edit_contact.picture_style
        self.assertNotEqual(new_picture_style, saved_picture_style,
                            'The picture associated with the contact was not changed.')

        contact_details = edit_contact.tap_update()

        self.assertEqual(full_name, contact_details.full_name)

        self.assertNotEqual(contact_details.image_style, saved_contact_image_style,
                            'The picture associated with the contact was not changed.')
