# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from gaiatest.apps.base import Base
from gaiatest.form_controls.header import GaiaHeader

class Report(Base):

    _text_type = (By.CSS_SELECTOR, 'p[data-l10n-id="message-type-sms"]')
    _time_sent_locator = (By.CSS_SELECTOR, 'span.sent-timestamp')
    _time_received_locator = (By.CSS_SELECTOR, 'span.received-timestamp')
    _header_locator = (By.ID, 'information-report-header')

    _sender_locator = (By.CSS_SELECTOR, 'span[data-l10n-id="report-from-title"] ~ .contact-list .js-contact-info')
    _receiver_locator = (By.CSS_SELECTOR, 'span[data-l10n-id="report-to-title"] ~ .contact-list .js-contact-info')

    def close(self):
        GaiaHeader(self.marionette, self._header_locator).go_back()
        from gaiatest.apps.messages.regions.message_thread import MessageThread
        return MessageThread(self.marionette) 

    def is_message_an_sms(self):
        return self.marionette.find_element(*self._text_type).get_attribute('data-l10n-id') == 'message-type-sms'

    @property
    def sent_date(self):
        timestamp_in_milliseconds = self.marionette.find_element(*self._time_sent_locator).get_attribute('data-l10n-date')
        return ((int)(timestamp_in_milliseconds) // 1000)

    @property
    def received_date(self):
        timestamp_in_milliseconds = self.marionette.find_element(*self._time_received_locator).get_attribute('data-l10n-date')
        return ((int)(timestamp_in_milliseconds) // 1000)

    @property
    def sender(self):
        return self.marionette.find_element(*self._sender_locator).text

    @property
    def receiver(self):
        return self.marionette.find_element(*self._receiver_locator).text
