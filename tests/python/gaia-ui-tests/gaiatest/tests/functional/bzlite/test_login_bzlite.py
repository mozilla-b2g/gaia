from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import Bugzilla_lite


class TestBugzillaLite(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_login_BugzillaLite(self):
        BugzillaLite = Bugzilla_lite(self.marionette)
        BugzillaLite.launch()
        BugzillaLite.dismiss_tooltip()
        BugzillaLite.login(self.testvars['bugzilla']['user'], self.testvars['bugzilla']['password'])
        self.assertTrue(BugzillaLite.is_logged_in)

