# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 18 minutes

from gaiatest import GaiaEnduranceTestCase

import datetime
import time


class TestEnduranceSmsConversation(GaiaEnduranceTestCase):

    # summary page
    _summary_header_locator = ('xpath', "//h1[text()='Messages']")
    _create_new_message_locator = ('id', 'icon-add')
    _unread_message_locator = ('css selector', 'li > a.unread')

    # message composition
    _receiver_input_locator = ('id', 'receiver-input')
    _message_field_locator = ('id', 'message-to-send')
    _send_message_button_locator = ('id', 'send-message')
    _back_header_link_locator = ('xpath', '//header/a[1]')
    _message_sending_spinner_locator = (
        'css selector',
        "img[src='style/images/spinningwheel_small_animation.gif']")

    # conversation
    _all_messages_locator = ('css selector', 'li.bubble')
    _received_message_content_locator = ('xpath', "//li[@class='bubble'][a[@class='received']]")
    _unread_icon_locator = ('css selector', 'aside.icon-unread')

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # delete any existing SMS messages to start clean
        self.data_layer.delete_all_sms()

        # temporary workaround for bug 837029: launch and then kill messages
        # app, to clear any left-over sms msg notifications
        self.app = self.apps.launch('Messages', False)
        time.sleep(2)
        self.apps.kill(self.app)
        time.sleep(2)

        # launch the app
        self.app = self.apps.launch('Messages')
        self.wait_for_element_displayed(*self._summary_header_locator)

    def test_endurance_sms_conversation(self):
        self.drive(test=self.sms_conversation, app='messages')

    def sms_conversation(self):
        # setup received sms callback
        self.marionette.execute_async_script("""
        SpecialPowers.setBoolPref("dom.sms.enabled", true);
        SpecialPowers.addPermission("sms", true, document);
        window.wrappedJSObject.gotEvent = false;
        window.navigator.mozSms.onreceived = function onreceived(event) {
            log("Received 'onreceived' smsmanager event");
            window.wrappedJSObject.gotEvent = true;
        };
        marionetteScriptFinished(1);
        """, special_powers=True)

        # while still in conversation view, create new message
        _text_message_content = "SMS %d of %d (sms conversation endurance test %s)" % (self.iteration, self.iterations, str(time.time()))
        create_new_message = self.marionette.find_element(*self._create_new_message_locator)
        create_new_message.tap()
        self.wait_for_element_present(*self._receiver_input_locator)

        # type phone number and message text
        contact_field = self.marionette.find_element(
            *self._receiver_input_locator)
        contact_field.send_keys(self.testvars['carrier']['phone_number'])
        message_field = self.marionette.find_element(
            *self._message_field_locator)
        message_field.send_keys(_text_message_content)
        time.sleep(1)

        # click send
        send_message_button = self.marionette.find_element(
            *self._send_message_button_locator)
        send_message_button.tap()

        # sleep a bit
        time.sleep(3)

        # verify/wait for the webapi new message callback, give 5 minutes; probably
        # received the new sms message by now anyway
        self.marionette.set_script_timeout(300000);
        self.marionette.execute_async_script("""
        function ready() {
            window.navigator.mozSms.onreceived = null;
            SpecialPowers.removePermission("sms", document);
            SpecialPowers.setBoolPref("dom.sms.enabled", false);
            marionetteScriptFinished(1);
        };
        waitFor(ready, function() {
            return(window.wrappedJSObject.gotEvent);
        });
        """, special_powers = True)

        # sleep with list of messages displayed; user would be here a bit to read messages
        # need sleep here anyway as with large number of messages can sometimes take awhile
        time.sleep(15)

        # TEMP: put back in after bug 850803 is fixed
        # verify sms count in msg list has increased by 2 (one sent, one received)
        #new_number_of_msgs = len(self.marionette.find_elements(*self._all_messages_locator))
        #self.assertEqual(new_number_of_msgs, (self.prev_number_of_msgs + 2))

        # TEMP: put back in after bug 850803 is fixed
        # verify received message text is correct
        #received_message = self.marionette.find_elements(
        #    *self._received_message_content_locator)[-1]
        #self.assertEqual(_text_message_content, received_message.text)

        # sleep between reps
        time.sleep(3)
