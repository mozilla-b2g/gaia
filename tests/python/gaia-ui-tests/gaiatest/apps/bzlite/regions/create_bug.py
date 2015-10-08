from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class CreateBug(Base):

    _title_input = (By.ID, 'summary')
    _description_input = (By.ID, 'description')
    _thumbnail_photo_locator = (By.CSS_SELECTOR, ".btn-file")
    _button_submit = (By.ID, 'submit')


    def _fill_title(self,title):
        title_element = self.marionette.find_element(*self._title_input)
        title_element.send_keys(title)

    def _fill_description(self,description):
        description_element = self.marionette.find_element(*self._description_input)
        description_element.send_keys(description)

    def _fill_picture(self):
        add_photo_element = self.marionette.find_element(*self._thumbnail_photo_locator)
        add_photo_element.tap()
        from gaiatest.apps.system.regions.activities import Activities
        gallery = Activities(self.marionette).tap_gallery()
        gallery.wait_for_thumbnails_to_load()
        image = gallery.tap_first_gallery_item()
        image.tap_crop_done()

    def _submit(self):
        submit_element = self.marionette.find_element(*self._button_submit)
        submit_element.tap()
