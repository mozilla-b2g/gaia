# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.apps.base import Base
from marionette.by import By

class TestContainer(Base):

    name = 'Test Container'
    _main_frame_locator = (By.ID, 'test-container')

    def launch(self):
        Base.launch(self)
        self.wait_for_element_present(*self._main_frame_locator)

