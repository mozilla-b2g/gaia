# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class Accessibility(Base):

    _screen_reader_volume_slider_locator = (
        By.CSS_SELECTOR, 'input[name="accessibility.screenreader-volume"]')
    _screen_reader_rate_slider_locator = (
        By.CSS_SELECTOR, 'input[name="accessibility.screenreader-rate"]')
