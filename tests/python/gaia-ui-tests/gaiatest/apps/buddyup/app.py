from gaiatest.apps.base import Base
from marionette_driver import By, Wait, expected

class BuddyUp(Base):

    name = 'BuddyUp'

    _buddyup_iframe_locator = (By.CSS_SELECTOR, 'iframe[src*="home.html"]')
    _settings = (By.ID, 'settings')
    _buddyup_profile_iframe = (By.CSS_SELECTOR, 'iframe[src$="profile.html"]')
    _create_account_button = (By.CSS_SELECTOR, 'a[href="authentication.html"]')

    def create_account(self):
    	iframe = self.marionette.find_element(*self._buddyup_iframe_locator)
        self.marionette.switch_to_frame(iframe)
        element_setting = self.marionette.find_element(*self._settings)
        element_setting.tap()
        self.marionette.switch_to_frame()
        iframe = self.marionette.find_element(*self._buddyup_profile_iframe)
        self.marionette.switch_to_frame(iframe)
        button_create_account = self.marionette.find_element(*self._create_account_button)
        button_create_account.tap()
        