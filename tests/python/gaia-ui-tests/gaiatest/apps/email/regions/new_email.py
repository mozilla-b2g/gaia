# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class NewEmail(Base):
    # Write new email

    _view_locator = (By.CSS_SELECTOR, '#cardContainer .card-compose')
    _to_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .cmp-to-text.cmp-addr-text')
    _cc_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .cmp-cc-text.cmp-addr-text')
    _bcc_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .cmp-bcc-text.cmp-addr-text')
    _subject_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .cmp-subject-text')
    _body_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .cmp-body-text')
    _send_locator = (By.CSS_SELECTOR, '#cardContainer .card.center .icon.icon-send')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        view = self.marionette.find_element(*self._view_locator)
        self.wait_for_condition(lambda m: view.location['x'] == 0)

    def type_to(self, value):
        self.marionette.find_element(*self._to_locator).tap()
        self.wait_for_condition(lambda m: self.keyboard.is_displayed())
        self.keyboard.send(value)
        self.keyboard.dismiss()

    def type_cc(self, value):
        self.marionette.find_element(*self._cc_locator).tap()
        self.wait_for_condition(lambda m: self.keyboard.is_displayed())
        self.keyboard.send(value)
        self.keyboard.dismiss()

    def type_bcc(self, value):
        self.marionette.find_element(*self._bcc_locator).tap()
        self.wait_for_condition(lambda m: self.keyboard.is_displayed())
        self.keyboard.send(value)
        self.keyboard.dismiss()

    def type_subject(self, value):
        self.marionette.find_element(*self._subject_locator).tap()
        self.wait_for_condition(lambda m: self.keyboard.is_displayed())
        self.keyboard.send(value)
        self.keyboard.dismiss()

    def type_body(self, value):
        self.marionette.find_element(*self._body_locator).tap()
        self.wait_for_condition(lambda m: self.keyboard.is_displayed())
        self.keyboard.send(value)
        self.keyboard.dismiss()

    def tap_send(self):
        self.marionette.find_element(*self._send_locator).tap()
        from gaiatest.apps.email.app import Email
        email = Email(self.marionette)
        email.wait_for_message_list()
        return email
