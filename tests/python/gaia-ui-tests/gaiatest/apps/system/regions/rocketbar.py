# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class RocketBar(Base):

    _rocket_bar_title_locator = (By.ID, 'rocketbar-title-content')

    def a11y_rocket_bar_activate(self):
        rocket_bar_title = self.marionette.find_element(*self._rocket_bar_title_locator)
        # Activated rocket bar title with a11y click.
        self.accessibility.click(rocket_bar_title)
