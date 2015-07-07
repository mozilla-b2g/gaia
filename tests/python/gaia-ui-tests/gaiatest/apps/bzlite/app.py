from marionette import Marionette
from gaiatest.apps.base import Base

class BugzillaLite(Base):

    name = 'Bzlite'
    _given_username = ('css selector', "#login input[type='email']")
    _given_password = ('css selector', "#login input[type='password']")
    _button_login = ('css selector', "#login input[type='submit']")
    # home frame
    home_frame = marionette.find_element('css selector', 'div.homescreen iframe')
    marionette.switch_to_frame(home_frame)
    #launch
    def launch (self):
        BugzLite_icon = marionette.find_element('xpath', "//div[@class='icon']//span[contains(text(),'Bugzilla Lite')]")
        BugzLite_icon.tap()
    
    #Switch context
    self.marionette.switch_to_frame()
    bugzillaLite_frame = marionette.find_element('css selector', "iframe[data-url*='bzlite.com']")
    self.marionette.switch_to_frame(bugzillaLite_frame)
    # log in
    def login (self,username,passwrd):
        marionette.find_element(*self._given_username).tap()
        marionette.find_element(*self._given_username).send_keys(username)
        marionette.find_element(*self._given_password).tap()
        marionette.find_element(*self._given_password).send_keys(passwrd)
        marionette.find_element(*self._button_login).tap()
        
