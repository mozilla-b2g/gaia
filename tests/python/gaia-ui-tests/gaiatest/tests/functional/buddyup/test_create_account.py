from gaiatest import GaiaTestCase
from gaiatest.apps.buddyup.app import BuddyUp

class TestCreateAccount(GaiaTestCase):

	def setUp(self):
		GaiaTestCase.setUp(self)
		self.connect_to_local_area_network()

	def test_create_account(self):
		buddyup = BuddyUp(self.marionette)
		buddyup.launch()
		buddyup.create_account()
