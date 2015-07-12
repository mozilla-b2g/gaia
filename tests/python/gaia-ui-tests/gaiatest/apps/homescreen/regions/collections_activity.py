# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class CollectionsActivity(Base):

    _src = 'app://collection.gaiamobile.org/create.html'

    _collection_option_locator = (By.CSS_SELECTOR, '#collections-select option')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.src == self._src)
        self.apps.switch_to_displayed_app()
        # See Bug 1162112, Marionette Wait() polling without interval might be interfering network load
        Wait(self.marionette, timeout=30, interval=5).until(expected.element_present(*self._collection_option_locator))

    @property
    def collection_name_list(self):
        return [option.text for option in self.marionette.find_elements(*self._collection_option_locator)]
