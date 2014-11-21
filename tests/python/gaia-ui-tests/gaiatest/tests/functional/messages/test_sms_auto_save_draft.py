# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from gaiatest import GaiaTestCase
from gaiatest.apps.messages.app import Messages


class TestSmsAutoSaveDrafts(GaiaTestCase):

    def test_sms_auto_save_draft(self):
        """
        https://moztrap.mozilla.org/manage/case/7806/
        """
        _text_message_content = "Automated Test %s" % str(time.time())

        # launch the app
        messages = Messages(self.marionette)
        messages.launch()

        # click new message
        new_message = messages.tap_create_new_message()
        new_message.type_message(_text_message_content)

        # Close message app and leave card view
        self.device.hold_home_button()
        from gaiatest.apps.system.regions.cards_view import CardsView
        cards_view = CardsView(self.marionette)
        cards_view.wait_for_cards_view()

        # Wait for first app ready
        cards_view.wait_for_card_ready('sms')
        cards_view.close_app('sms')
        self.assertFalse(cards_view.is_app_present('sms'),
                         "Killed app not expected to appear in cards view")

        # Re-open message app
        messages.launch()
        #assertTrue(messages.draft_message[0].is_draft_icon_displayed)
        new_message = messages.draft_message[0].tap_draft_message()

        # Check that last message draft is shown correctly
        self.assertEqual(new_message.message, _text_message_content)
