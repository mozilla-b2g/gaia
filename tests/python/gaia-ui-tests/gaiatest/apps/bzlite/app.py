from gaiatest.apps.base import Base
from marionette_driver import By, Wait, expected
import time
from gaiatest.apps.base import PageRegion


class BugzillaLite(Base):


    name = 'Bugzilla Lite'
    manifest_url = "https://www.bzlite.com/manifest.webapp"
    _given_username = (By.CSS_SELECTOR, "#login input[type='email']")
    _given_password = (By.CSS_SELECTOR, "#login input[type='password']")
    _button_login = (By.CSS_SELECTOR, "#login input[type='submit']")
    _profile_icon = (By.CSS_SELECTOR, "a[href='/profile/']")
    _button_logout = (By.CSS_SELECTOR, "a[href='/logout/']")
    _create_button = (By.CSS_SELECTOR, 'a[href="/create/"]')
    _dashboard_navigator_locator = (By.ID, 'dashboardNav')
    _login_form_locator = (By.ID, 'login')
    _popup_intro = (By.ID, 'intro')
    _button_popup_intro = (By.ID, 'intro-submit')
    _close_locator = (By.CSS_SELECTOR, '.headerBtn.close')
    _content_locator = (By.ID, 'content')
    _bugpage_locator = (By.CSS_SELECTOR, '.bugPage')
    _back_locator = (By.CSS_SELECTOR, 'a[href="/"]')
    _filed_bug_locator = (By.CSS_SELECTOR, '#dashboardNav a[href="/dashboard/filed/"]')
    _filed_bug_name = (By.CSS_SELECTOR, '.dashboard ul a')
    _commentsLink_locator = (By.CSS_SELECTOR, '#bugNav .commentsLink')
    _detailsLink_locator = (By.CSS_SELECTOR, '#bugNav .detailsLink')
    _attachLink_locator = (By.CSS_SELECTOR, '#bugNav .attachLink')


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


class BugzillaLiteStage(BugzillaLite):


    name =  'Bugzilla Lite Stage'
    manifest_url = 'http://bzlite-staging.herokuapp.com/manifest.webapp'

    def dismiss_content(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._content_locator))))
        self.marionette.find_element(*self._close_locator).tap()
        Wait(self.marionette).until(expected.element_displayed(*self._login_form_locator))
        import time
        time.sleep(1)

    def create_new_bug(self, title, description):
        self.marionette.find_element(*self._create_button).tap()
        from gaiatest.apps.bzlite.regions.create_bug import CreateBug
        
        CreateBug(self.marionette)._fill_title(title)
        CreateBug(self.marionette)._fill_description(description)
        CreateBug(self.marionette)._fill_picture()
        CreateBug(self.marionette)._submit()

        time.sleep(10)
        Wait(self.marionette,timeout=20).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._bugpage_locator))))

    def navigate_filed_bug(self):
        self.marionette.find_element(*self._back_locator).tap()
        self.marionette.find_element(*self._filed_bug_locator).tap()
        self.marionette.find_element(*self._filed_bug_name).tap()
       
        time.sleep(2)
        details_element = self.marionette.find_element(*self._detailsLink_locator)
        details_element.tap()
        time.sleep(2)
        attach_element = self.marionette.find_element(*self._attachLink_locator)
        attach_element.tap()
        time.sleep(2)
        comment_element = self.marionette.find_element(*self._commentsLink_locator)
        comment_element.tap()
