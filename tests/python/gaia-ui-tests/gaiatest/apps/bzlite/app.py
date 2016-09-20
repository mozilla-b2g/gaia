from marionette import Marionette
from gaiatest.apps.base import Base
from marionette_driver import By, Wait, expected

class BugzillaLite(Base):

    name = 'Bugzilla Lite'
    _given_username = (By.CSS_SELECTOR, "#login input[type='email']")
    _given_password = (By.CSS_SELECTOR, "#login input[type='password']")
    _button_login = (By.CSS_SELECTOR, "#login input[type='submit']")
    _profile_icon = (By.CSS_SELECTOR, ".profile")
    _button_logout = (By.CSS_SELECTOR, ".btn")
    _dashboard_navigator_locator = (By.ID, 'dashboardNav')
    _dashboard_login_locator = (By.ID, 'login')
    _popup_intro = (By.ID, 'intro')
    _button_popup_intro = (By.ID, 'intro-submit')
    _assigned_icon = (By.CSS_SELECTOR, '.assigned')
    _flagged_icon = (By.CSS_SELECTOR, '.flagged')
    _filed_icon = (By.CSS_SELECTOR, '.filed')
    _search_bar = (By.ID, 'searchLink')
    _button_cancel_search = (By.LINK_TEXT, 'Cancel')

    def uninstall (self, name):
        result = self.marionette.execute_async_script('GaiaApps.uninstallWithName("%s")' % name)
        assert (result is True), 'Failed to uninstall app: %s' % result

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

    def follow_bugs(self):
        self.marionette.find_element(*self._flagged_icon).tap()
        self.marionette.find_element(*self._filed_icon).tap()
        self.marionette.find_element(*self._assigned_icon).tap()

    def search(self, number):
        searchbar_element = self.marionette.find_element(*self._search_bar)
        searchbar_element.tap()
        number_to_enter = self.keyboard.send(number)
        searchbar_element.send_keys(number_to_enter)

    def cancelSearch(self):
        searchbar_element = self.marionette.find_element(*self._search_bar)
        searchbar_element.tap()
        cancelsearch_element = self.marionette.find_element(*self._button_cancel_search)
        cancelsearch_element.tap()

    @property
    def is_logged_in(self):
        self.wait_for_dashboard_navigator_to_be_displayed()
        return True

    def wait_for_dashboard_login_to_be_displayed(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(*self._dashboard_login_locator))))

    def dismiss_tooltip(self):
        tooltip_element = self.marionette.find_element(*self._popup_intro).find_element(*self._button_popup_intro)
        tooltip_element.tap()
