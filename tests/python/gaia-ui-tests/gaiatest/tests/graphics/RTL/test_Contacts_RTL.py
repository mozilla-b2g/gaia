from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.contacts.app import Contacts
from marionette_driver import expected, By, Wait

class TestContactsRTL(GaiaImageCompareTestCase):

    def setUp(self):
       GaiaImageCompareTestCase.setUp(self)

       self.push_resource('IMG_0001.jpg')

    def test_contacts_app(self):

        _phone_categorie_locator = (By.CSS_SELECTOR, 'legen[class="action"]')

        contacts = Contacts(self.marionette)
        contacts.launch()
        self.take_screenshot('contacts')
        view_settings = contacts.tap_settings()
        self.take_screenshot('contacts-setting')
        view_settings.tap_import_contacts()
        self.take_screenshot('contacts-import')
        view_settings.tap_import_from_sim()
        self.take_screenshot('contacts-sim_import')
        view_settings.tap_back_from_import_contacts()
        self.take_screenshot('contacts-back_to_settings')
        view_settings.tap_order_by_last_name()
        self.take_screenshot('contacts-orderby_lastname')
        view_settings.tap_done()
        self.take_screenshot('contacts-tap_done')
        for i in range(0, 2):
            GaiaImageCompareTestCase.scroll(self.marionette, 'down', contacts.screen_element.size['height'], screen=contacts.screen_element)
            self.take_screenshot('main')

        some_contacts = contacts.tap_new_contact()
        self.take_screenshot('contacts-new_contact')
        some_contacts.type_given_name("testing")
        some_contacts.type_family_name("tester")
        self.marionette.find_element(*self._phone_categorie_locator).tap()
        self.take_screenshot('contacts-chose_categ_phone')
        some_contacts.type_phone("52306148")
        some_contacts.type_email("test-test@gmail.com")
        some_contacts.type_street("Rue tester")
        some_contacts.type_city('Manouba')
        some_contacts.type_country('TestCountry')
        some_contacts.type_zip_codeo('2563')
        some_contacts.type_comment('this comment for test')
        activities_list = some_contacts.tap_picture()
        self.take_screenshot('contacts-picture')
        gallery = activities_list.tap_gallery()
        self.take_screenshot('contacts-from_gallery')
        gallery.wait_for_thumbnails_to_load()
        self.assertGreater(gallery.gallery_items_number, 0, 'No photos were found in the gallery.')
        self.take_screenshot('contacts-load_gallery')
        image = gallery.tap_first_gallery_item()
        self.take_screenshot('contacts-take_first_photo')
        image.tap_crop_done()
        self.take_screenshot('contacts-crop_photo')
        some_contacts.tap_done()
        self.take_screenshot('contacts-save')
