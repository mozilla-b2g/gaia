from marionette import Marionette
from gaiatest.apps.base import Base
from marionette_driver import By, Wait, expected

class BugzillaLite(Base):

    name = 'Bugzilla Lite'
    _given_username = (By.CSS_SELECTOR, "#login input[type='email']")
    _given_password = (By.CSS_SELECTOR, "#login input[type='password']")
    _button_login = (By.CSS_SELECTOR, "#login input[type='submit']")
    _app_ready_locator = (By.XPATH, "//div[@class='icon']//span[contains(text(),'Bugzilla Lite')]")
    # home frame
    home_frame = marionette.find_element('css selector', 'div.homescreen iframe')
    marionette.switch_to_frame(home_frame)
    #launch
    def launch (self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self!;_app_ready_locator))))

    
    #Switch context
    self.app.switch_to_displayed_app()
    # log in
    def login (self,username,passwrd):
        marionette.find_element(*self._given_username).tap()
        marionette.find_element(*self._given_username).send_keys(username)
        marionette.find_element(*self._given_password).tap()
        marionette.find_element(*self._given_password).send_keys(passwrd)
        marionette.find_element(*self._button_login).tap()
        
