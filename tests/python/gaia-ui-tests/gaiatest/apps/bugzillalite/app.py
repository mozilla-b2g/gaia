from gaiatest.apps.base import Base
from marionette_driver import By, Wait, expected

class BugzillaLite(Base):

    name = 'Bugzilla Lite'
    manifest_url = "https://www.bzlite.com/manifest.webapp"
    _given_username = (By.CSS_SELECTOR, "#login input[type='email']")
    _given_password = (By.CSS_SELECTOR, "#login input[type='password']")
    _button_login = (By.CSS_SELECTOR, "#login input[type='submit']")
    _profile_icon = (By.CSS_SELECTOR, "a[href='/profile/']")
    _button_logout = (By.CSS_SELECTOR, "a[href='/logout/']")
    _dashboard_navigator_locator = (By.ID, 'dashboardNav')
    _login_form_locator = (By.ID, 'login')
    _popup_intro = (By.ID, 'intro')
    _button_popup_intro = (By.ID, 'intro-submit')
    def login (self, username, password):
        username_element = self.marionette.find_element(*self._given_username)
        username_element.tap()
        username_element.send_keys(username)
        password_element = self.marionette.find_element(*self._given_password)
        password_element.tap()
        password_element.send_keys(password)
        button_element = self.marionette.find_element(*self._button_login)
        button_element.tap()

    def logout(self):
        profile_element = self.marionette.find_element(*self._profile_icon)
        profile_element.tap()
        logout_element = self.marionette.find_element(*self._button_logout)
        logout_element.tap()

    @property
    def is_logged_in(self):
        self.wait_for_dashboard_navigator_to_be_displayed()
        return True

    def wait_for_dashboard_navigator_to_be_displayed(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._dashboard_navigator_locator))))

    @property
    def is_logged_out(self):
        self.wait_for_login_form_to_be_displayed()
        return True

    def wait_for_login_form_to_be_displayed(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._login_form_locator))))

    def dismiss_tooltip(self):
        confirm_element = Wait(self.marionette).until(expected.element_present(*self._button_popup_intro))
        Wait(self.marionette).until(expected.element_displayed(confirm_element))
        confirm_element.tap()
