# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class CollectionsActivity(Base):

    _src = 'app://collection.gaiamobile.org/create.html'

    _collection_loading_locator = (By.ID, 'loading')
    _collection_option_locator = (By.CSS_SELECTOR, '#collections-select option')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.src == self._src)
        self.apps.switch_to_displayed_app()
        loading = self.marionette.find_element(*self._collection_loading_locator)
        Wait(self.marionette).until(expected.element_not_displayed(loading))

    @property
    def collection_name_list(self):
        return [option.text for option in self.marionette.find_elements(*self._collection_option_locator)]
