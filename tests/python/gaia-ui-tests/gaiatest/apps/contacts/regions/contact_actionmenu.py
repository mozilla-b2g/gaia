from marionette.by import By

from gaiatest.apps.base import Base

class ContactsActionMenu(Base):

    _first_phone_number = (By.XPATH, "//form[@id='action-menu']//menu[@id='value-menu']/button[1]")

    def tap_first_phone_number(self):
        self.marionette.find_element(*self._first_phone_number).tap()
