# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 100 minutes

from gaiatest import GaiaEnduranceTestCase

import os
import datetime
import time


class TestEnduranceSmsSendReceive(GaiaEnduranceTestCase):

    # summary page
    _summary_header_locator = ('xpath', "//h1[text()='Messages']")
    _create_new_message_locator = ('id', 'icon-add')
    _thread_list_locator = ('css selector', '#thread-list li > a')

    # message composition
    _receiver_input_locator = ('id', 'receiver-input')
    _message_field_locator = ('id', 'message-to-send')
    _send_message_button_locator = ('id', 'send-message')
    _back_header_link_locator = ('xpath', '//header/a[1]')
    _message_sending_spinner_locator = (
        'css selector',
        "img[src='style/images/spinningwheel_small_animation.gif']")

    # conversation
    _received_message_content_locator = ('xpath', "//li[@class='bubble'][a[@class='received']]")

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

    def test_endurance_sms_send_receive(self):
        self.drive(test=self.sms_send_receive, app='messages')

    def sms_send_receive(self):
        # send a message to self, wait for it to arrive, verify. Back to main message list in between.
        # setup received sms callback
        self.marionette.execute_async_script("""
        SpecialPowers.setBoolPref("dom.sms.enabled", true);
        SpecialPowers.addPermission("sms", true, document);
        window.wrappedJSObject.gotEvent = false;
        window.navigator.mozMobileMessage.onreceived = function onreceived(event) {
            log("Received 'onreceived' smsmanager event");
            window.wrappedJSObject.gotEvent = true;
        };
        marionetteScriptFinished(1);
        """, special_powers=True)

        # create new message
        self.wait_for_element_displayed(*self._summary_header_locator)
        _text_message_content = "SMS %d of %d (send receive endurance test %s)" % (self.iteration, self.iterations, str(time.time()))
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
        time.sleep(1)

        # go back to main message list
        back_header_button = self.marionette.find_element(*self._back_header_link_locator)
        back_header_button.tap()
        self.wait_for_element_displayed(*self._summary_header_locator)
        time.sleep(5)

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

        # click on the sms conversation in the message list i.e. user checking the new message
        time.sleep(5)
        sms_thread = self.marionette.find_element(*self._thread_list_locator)
        sms_thread.tap()

        # sleep with list of messages displayed; user would be here a bit to read messages
        # need sleep here anyway as with large number of messages can sometimes take awhile
        time.sleep(30)

        # TEMP: put back in after bug 850803 is fixed
        # verify received message text is correct
        #received_message = self.marionette.find_elements(
        #    *self._received_message_content_locator)[-1]
        #self.assertEqual(_text_message_content, received_message.text)

        # now go back to main message list, so ready for next iteration
        back_header_button = self.marionette.find_element(*self._back_header_link_locator)
        back_header_button.tap()

        # sleep between reps
        time.sleep(10)
