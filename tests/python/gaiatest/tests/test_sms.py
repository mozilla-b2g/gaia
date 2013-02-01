# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import time


class TestSms(GaiaTestCase):

    # Summary page
    _summary_header_locator = ('xpath', "//h1[text()='Messages']")
    _create_new_message_locator = ('id', 'icon-add')
    _unread_message_locator = ('css selector', 'li > a.unread')

    # Message composition
    _receiver_input_locator = ('id', 'receiver-input')
    _message_field_locator = ('id', 'message-to-send')
    _send_message_button_locator = ('id', 'send-message')
    _back_header_link_locator = ('xpath', '//header/a[1]')
    _message_sending_spinner_locator = (
        'css selector',
        "img[src='style/images/spinningwheel_small_animation.gif']")

    # Conversation view
    _all_messages_locator = ('css selector', 'li.bubble')
    _received_message_content_locator = ('xpath', "//li[@class='bubble'][a[@class='received']]")
    _unread_icon_locator = ('css selector', 'aside.icon-unread')

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the app
        self.app = self.apps.launch('Messages')

    def test_sms_send(self):
        # https://moztrap.mozilla.org/manage/case/1322/

        '''
        This test sends a text message to itself. It waits for a reply message.
        It does not yet clean up after itself but it can handle it.
        '''

        _text_message_content = "Automated Test %s" % str(time.time())

        self.wait_for_element_displayed(*self._summary_header_locator)

        # click new message
        create_new_message = self.marionette.find_element(*self._create_new_message_locator)
        self.marionette.tap(create_new_message)

        self.wait_for_element_present(*self._receiver_input_locator)
        # type phone number
        contact_field = self.marionette.find_element(
            *self._receiver_input_locator)
        contact_field.send_keys(self.testvars['this_phone_number'])

        message_field = self.marionette.find_element(
            *self._message_field_locator)
        message_field.send_keys(_text_message_content)

        #click send
        send_message_button = self.marionette.find_element(
            *self._send_message_button_locator)
        self.marionette.tap(send_message_button)

        self.wait_for_element_not_present(
            *self._message_sending_spinner_locator, timeout=120)

        # go back
        back_header_button = self.marionette.find_element(*self._back_header_link_locator)
        self.marionette.tap(back_header_button)

        # now wait for the return message to arrive.
        self.wait_for_element_displayed(*self._unread_message_locator, timeout=180)

        # go into the new message
        unread_message = self.marionette.find_element(*self._unread_message_locator)
        self.marionette.tap(unread_message)
        self.wait_for_element_not_displayed(*self._unread_icon_locator)

        self.wait_for_element_displayed(*self._received_message_content_locator)
        # get the most recent listed and most recent received text message
        received_message = self.marionette.find_elements(
            *self._received_message_content_locator)[-1]

        last_message = self.marionette.find_elements(*self._all_messages_locator)[-1]

        # Check the most recent received message has the same text content
        self.assertEqual(_text_message_content, received_message.text)

        # Check that most recent message is also the most recent received message
        self.assertEqual(received_message.get_attribute('id'),
                         last_message.get_attribute('id'))
