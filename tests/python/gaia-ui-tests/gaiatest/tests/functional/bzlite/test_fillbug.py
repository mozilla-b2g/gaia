from gaiatest import GaiaTestCase
from gaiatest.apps.bzlite.app import BugzillaLite

class TestFillBug(GaiaTestCase):
	def setUp(self):
		GaiaTestCase.setUp(self)
		self.connect_to_local_area_network()

    def test_fill_new_bug(self):
    	bugzilla_lite = BugzillaLite(self.marionette)
    	bugzilla_lite.launch()
    	bugzilla_lite.tap_new_bug(slef.testvars['fill_bug']['title'], self.testvars['fill_bug']['description'])
