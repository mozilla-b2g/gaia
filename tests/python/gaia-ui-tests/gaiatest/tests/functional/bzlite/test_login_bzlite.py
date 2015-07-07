from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import Bzlite


class TestBugzillaLite(GaiaTestCase):
    def test_login_BugzillaLite(self):
        self.bzlite = Bzlite(self.marionette)
        slef.bzlite.launch()
        # enter the username and the password
        self.bzlite.login('manel.rhaiem92@gmail.com', '*****************')
        # check the log in 
        self.assertTrue(self.bzlite.is_logged_in)

