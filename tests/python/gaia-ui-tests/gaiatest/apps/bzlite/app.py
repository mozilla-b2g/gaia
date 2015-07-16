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
    _assigned_icon = (By.CSS_SELECTOR, '#dashboardNav .assigned')
    _flagged_icon = (By.CSS_SELECTOR, '#dashboardNav .flagged')
    _filed_icon = (By.CSS_SELECTOR, '#dashboardNav .filed')
    _search_bar = (By.ID, 'searchLink')
    _button_cancel_search = (By.LINK_TEXT, 'Cancel')
    _title_input = (By.ID, 'summary')
    _description_input = (By.ID, 'description')
    _attachment_link = (By.CSS_SELECTOR, ".btn-file")
    _button_submit = (By.CSS_SELECTOR, "#createBug input[type='submit']")
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

    def followBugs(self):
        print'function started'
        flagged_element = self.marionette.find_element(*self._flagged_icon)
        print'flagged started'
        flagged_element.tap()
        filed_element = self.marionette.find_element(*self._filed_icon)
        print'filed started'
        filed_element.tap()
        assigned_element = self.marionette.find_element(*self._assigned_icon)
        print'assigned started'
        assigned_element.tap()

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

    def tap_new_bug(self, title, description):
        title_element = self.marionette.find_element(*self._title_input)
        title_element.tap()
        title_element.send_keys(title)
        description_element = self.marionette.find_element(*self._description_input)
        description_element.tap()
        description_element.send_keys(description)
        submit_element = self.marionette.find_element(*self._button_submit)
        submit_element.tap()
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
