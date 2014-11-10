# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Approximate runtime per 100 iterations: 100 minutes

from gaiatest import GaiaEnduranceTestCase
from gaiatest.apps.messages.app import Messages

import os
import datetime
import time


class TestEnduranceSmsSendReceive(GaiaEnduranceTestCase):

    def setUp(self):
        GaiaEnduranceTestCase.setUp(self)

        # delete any existing SMS messages to start clean
        self.data_layer.delete_all_sms()

        # launch the app
        self.messages = Messages(self.marionette)
        self.messages.launch()

    def test_endurance_sms_send_receive(self):
        self.drive(test=self.sms_send_receive, app='messages')

    def sms_send_receive(self):
        # send a message to self, wait for it to arrive, back to main message list
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
        _text_message_content = "SMS %d of %d (send receive endurance test %s)" % (self.iteration, self.iterations, str(time.time()))
        new_message = self.messages.tap_create_new_message()
        new_message.type_phone_number(self.testvars['carrier']['phone_number'])
        new_message.type_message(_text_message_content)

        # send
        self.message_thread = new_message.tap_send()     

        # verify/wait for the webapi new message callback, give 5 minutes; probably
        # received the new sms message by now anyway
        self.marionette.set_script_timeout(300000);
        self.marionette.execute_async_script("""
        function ready() {
            window.navigator.mozMobileMessage.onreceived = null;
            SpecialPowers.removePermission("sms", document);
            SpecialPowers.setBoolPref("dom.sms.enabled", false);
            marionetteScriptFinished(1);
        };
        waitFor(ready, function() {
            return(window.wrappedJSObject.gotEvent);
        });
        """, special_powers = True)

        # go back to main message list for next rep
        self.message_thread.tap_back_button()

        # sleep between reps
        time.sleep(30)
