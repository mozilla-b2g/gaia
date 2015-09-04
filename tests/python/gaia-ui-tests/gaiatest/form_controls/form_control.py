# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, Wait
from gaiatest.apps.base import PageRegion


class Widget(PageRegion):
    def __init__(self, marionette, locator):
        element = Wait(marionette).until(expected.element_present(*locator))
        PageRegion.__init__(self, marionette, element)
