from marionette.by import By
from gaiatest.apps.base import Base

class AddCollectionsMenu(Base):
    
    
    _collections_menu_locator = (By.ID, 'collections-select')
    _auto_collection_option_locator = (By.XPATH, "//section[@id='collections-select']//li[a[text()='%s']]")
    _cancel_button_locator = (By.ID, 'confirm-dialog-cancel-button')
    _confirm_button_locator = (By.ID, 'confirm-dialog-confirm-button')
    
    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_element_displayed(*self._collections_menu_locator)
    
    
    def app_locator(self, app):
        return (self._apps_locator[0], self._apps_locator[1] % app)
    
    def tap_app(self, app):
        self.marionette.find_element(*self.app_locator(app)).tap()
    
    def tap_cancel(self):
        self.wait_for_element_displayed(*self._cancel_button_locator)
        self.marionette.find_element(*self._cancel_button_locator).tap()
    
    def tap_confirm(self):
        self.wait_for_element_displayed(*self._confirm_button_locator)
        self.marionette.find_element(*self._confirm_button_locator).tap()
