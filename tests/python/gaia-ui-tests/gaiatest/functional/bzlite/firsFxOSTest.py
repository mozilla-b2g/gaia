import time
from marionette import Marionette
from marionette_driver import By
class TestBugzillaLite:
    def __init__(self):
        self.test_login_BugzillaLite()

    def test_login_BugzillaLite(self):
        #Client session
        self.marionette = Marionette()
        self.marionette.start_session()
        time.sleep(2)
        home_frame = self.marionette.find_element('css selector', 'div.homescreen iframe')
        self.marionette.switch_to_frame(home_frame)
        BugzLite_icon = self.marionette.find_element('xpath', "//div[@class='icon']//span[contains(text(),'Bugzilla Lite')]")
        BugzLite_icon.tap()
        # Switch context back
        self.marionette.switch_to_frame()
        time.sleep(2)
        # Switch context to the Bugzilla lite App
        bugzillaLite_frame = self.marionette.find_element('css selector', "iframe[data-url*='bzlite.com']")
        self.marionette.switch_to_frame(bugzillaLite_frame)
        # Tap input to enter email adress
        self.marionette.find_element('css selector', "#login input[type='email']").tap()
        time.sleep(2)
        # Type email adress
        self.marionette.find_element('css selector', "#login input[type='email']").send_keys('manel.rhaiem92@gmail.com')
        time.sleep(2)
        # Tap input to enter the password
        self.marionette.find_element('css selector', "#login input[type='password']").tap()
        time.sleep(2)
        # Type password
        self.marionette.find_element('css selector', "#login input[type='password']").send_keys('******************')
        # Tap input submit to log in
        self.marionette.find_element('css selector', "#login input[type='submit']").tap()

if __name__ == '__main__':
    TestBugzillaLite()
