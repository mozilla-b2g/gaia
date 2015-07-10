from marionette import Marionette
from gaiatest.apps.base import Base
from marionette_driver import By, Wait, expected

class Bugzilla_Lite(Base):

    name = 'Bugzilla Lite'
    _given_username = (By.CSS_SELECTOR, "#login input[type='email']")
    _given_password = (By.CSS_SELECTOR, "#login input[type='password']")
    _button_login = (By.CSS_SELECTOR, "#login input[type='submit']")
    _app_ready_locator = (By.XPATH, "#content header")
    _dashboard_navigator_locator = (By.ID, 'dashboardNav')
    
    def launch (self):
        Base.launch(self)

    def login (self, username, password):
        username_element = self.marionette.find_element(*self._given_username)
        username_element.tap()
        username_element.send_keys(username)
        password_element = self.marionette.find_element(*self._given_password)
        password_element.tap()
        password_element.send_keys(password)
        button_element = self.marionette.find_element(*self._button_login)
        button_element.tap()

    @property
    def is_logged_in(self):
        self.wait_for_dashboard_navigator_to_be_displayed()
        return True

    def wait_for_dashboard_navigator_to_be_displayed(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._dashboard_navigator_locator))))
