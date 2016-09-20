from gaiatest import GaiaTestCase
import time
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.messages.app import Messages
from gaiatest.apps.cost_control.app import CostControl


class TestFunctionalitySimManager(GaiaTestCase):

    def test_functionality_sim_manager(self):
        
        settings = Settings(self.marionette)
        settings.launch()
        sim_manager_settings = settings.open_sim_manager()

        sim_manager_settings.select_outgoing_calls("SIM 2")
        sim_manager_settings.select_data("SIM 2")
        sim_manager_settings.select_outgoing_messages("Always ask")

        phone = Phone(self.marionette)
        phone.launch()

        phone.make_call_and_hang_up(self.testvars["remote_phone_number"])

        cost_control = CostControl(self.marionette)
        cost_control.launch()
        cost_control.toggle_mobile_data_tracking(False)
        cost_control.toggle_wifi_data_tracking(True)

        _text_message_content = "Automated Test %s" % str(time.time())

        # launch the app
        self.messages = Messages(self.marionette)
        self.messages.launch()

        # click new message
        new_message = self.messages.tap_create_new_message()
        new_message.type_phone_number(self.environment.phone_numbers[0])

        new_message.type_message(_text_message_content)

        #click send
        self.message_thread = new_message.tap_send()
        self.message_thread.wait_for_received_messages()
        self.data_layer.connect_to_wifi()

        # Check the most recent received message has the same text content
        self.assertEqual(_text_message_content, last_received_message.text)
