# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By, Wait

from gaiatest.apps.base import Base


class ReadEmail(Base):

    _body_locator = (By.CSS_SELECTOR, '.card.center .msg-body-content')
    _subject_locator = (By.CSS_SELECTOR, '.card.center .msg-envelope-subject')
    _senders_email_locator = (By.CSS_SELECTOR, '.msg-reader-header-label')

    _delete_button_locator = (By.CSS_SELECTOR, '.msg-reader-action-toolbar .icon.msg-delete-btn')
    _star_button_locator = (By.CSS_SELECTOR, '.msg-reader-action-toolbar .icon.msg-star-btn')
    _mark_button_locator = (By.CSS_SELECTOR, '.msg-reader-action-toolbar .icon.msg-mark-read-btn')
    _move_button_locator = (By.CSS_SELECTOR, '.msg-reader-action-toolbar .icon.msg-move-btn')
    _reply_button_locator = (By.CSS_SELECTOR, '.msg-reader-action-toolbar .icon.msg-reply-btn')

    _delete_approve_button_locator = (By.ID, 'msg-delete-ok')
    _delete_cancel_button_locator = (By.ID, 'msg-delete-cancel')
    _move_cancel_button_locator = (By.CSS_SELECTOR, '.full')
    _reply_cancel_button_locator = (By.CSS_SELECTOR, '.msg-reply-menu-cancel')

    @property
    def body(self):
        return self.marionette.find_element(*self._body_locator).text

    @property
    def subject(self):
        return self.marionette.find_element(*self._subject_locator).text

    def wait_for_senders_email_displayed(self):
        Wait(self.marionette).until(lambda m: m.find_element(*self._senders_email_locator).text != '')

    @property
    def senders_email(self):
        return self.marionette.find_element(*self._senders_email_locator).text

    def tap_delete_button(self):
        self.marionette.find_element(*self._delete_button_locator).tap()

    def tap_star_button(self):
        self.marionette.find_element(*self._star_button_locator).tap()

    def tap_mark_button(self):
        self.marionette.find_element(*self._mark_button_locator).tap()

    def tap_move_button(self):
        self.marionette.find_element(*self._move_button_locator).tap()

    def tap_reply_button(self):
        self.marionette.find_element(*self._reply_button_locator).tap()

    def approve_delete(self):
        self.marionette.find_element(*self._delete_approve_button_locator).tap()

    def cancel_delete(self):
        self.marionette.find_element(*self._delete_cancel_button_locator).tap()

    def cancel_move(self):
        self.marionette.find_element(*self._move_cancel_button_locator).tap()

    def cancel_reply(self):
        self.marionette.find_element(*self._reply_cancel_button_locator).tap()
