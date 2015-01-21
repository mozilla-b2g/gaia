# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

try:
    from marionette.by import By
except:
    from marionette_driver.by import By

from gaiatest.apps.base import Base


class ReadEmail(Base):

    _body_locator = (By.CSS_SELECTOR, '.card.center .msg-body-content')
    _subject_locator = (By.CSS_SELECTOR, '.card.center .msg-envelope-subject')
    _senders_email_locator = (By.CSS_SELECTOR, '.msg-reader-header-label')

    @property
    def body(self):
        return self.marionette.find_element(*self._body_locator).text

    @property
    def subject(self):
        return self.marionette.find_element(*self._subject_locator).text

    @property
    def senders_email(self):
        return self.marionette.find_element(*self._senders_email_locator).text
