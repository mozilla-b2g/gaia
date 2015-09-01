from gaiatest.apps.base import Base
from marionette_driver import By, Wait, expected

class BuddyUp(Base):

	name = 'BuddyUp'

	_settings = (By.ID, 'settings')

	def create_account(self):
		self.apps.switch_to_displayed_app()
		element_setting = self.marionette.find_element(*self._settings)
		element_setting.tap()
		self.apps.switch_to_displayed_app()
		