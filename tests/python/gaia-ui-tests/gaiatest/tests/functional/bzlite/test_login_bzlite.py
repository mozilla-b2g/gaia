from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import BugzillaLite


class TestBugzillaLite(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)
        self.connect_to_local_area_network()

    def test_login_BugzillaLite(self):
        bugzilla_lite = BugzillaLite(self.marionette)
        bugzilla_lite.launch()
        bugzilla_lite.dismiss_tooltip()
        bugzilla_lite.login(self.testvars['bugzilla']['user'], self.testvars['bugzilla']['password'])
        self.assertTrue(bugzilla_lite.is_logged_in)

