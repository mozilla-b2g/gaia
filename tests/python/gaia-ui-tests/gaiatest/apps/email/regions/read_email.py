# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette import expected
from marionette import Wait
from gaiatest.apps.base import Base


class ReadEmail(Base):

    _body_locator = (By.CSS_SELECTOR, '.card.center .msg-body-content')
    _subject_locator = (By.CSS_SELECTOR, '.card.center .msg-envelope-subject')
    _senders_email_locator = (By.CSS_SELECTOR, '.msg-reader-header-label')
    _read_email_view_locator = (By.CSS_SELECTOR, '.card.center[data-type="message_reader"]')

    def wait_for_read_email_view(self):
        element = Wait(self.marionette).until(expected.element_present(*self._read_email_view_locator))
        Wait(self.marionette).until(expected.element_displayed(element))

    @property
    def body(self):
        return self.marionette.find_element(*self._body_locator).text

    @property
    def subject(self):
        return self.marionette.find_element(*self._subject_locator).text

    @property
    def senders_email(self):
        return self.marionette.find_element(*self._senders_email_locator).text
