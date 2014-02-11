# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time
from marionette.by import By
from gaiatest.apps.base import Base


class SimManager(Base):

    _outgoing_call_locator = (By.ID, "sim-manager-outgoing-call-select")
    _outgoing_messages_locator = (By.ID, "sim-manager-outgoing-messages-select")
    _outgoing_data_locator = (By.ID, "sim-manager-outgoing-data-select")
    _back_button_locator = (By.CSS_SELECTOR, '.current header > a') 
    _confirm_suspended_locator = (By.CSS_SELECTOR, '.modal-dialog-confirm-ok')

    def go_back(self):
        self.marionette.find_element(*self._back_button_locator).tap()

    def select_outgoing_call(self, sim):
        self.marionette.find_element(*self._outgoing_call_locator).tap()
        self.select('SIM '+str(sim))

    def select_outgoing_messages(self, sim):
        self.marionette.find_element(*self._outgoing_messages_locator).tap()
        self.select('SIM '+str(sim))

    def select_data(self, sim):
        self.marionette.find_element(*self._outgoing_data_locator).tap()
        self.select_and_confirm('SIM '+str(sim))

    def select_and_confirm(self, match_string):
        # cheeky Select wrapper until Marionette has its own
        # due to the way B2G wraps the app's select box we match on text

        _list_item_locator = (By.XPATH, "id('value-selector-container')/descendant::li[descendant::span[.='%s']]" % match_string)
        _close_button_locator = (By.CSS_SELECTOR, 'button.value-option-confirm')

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()
        # TODO we should find something suitable to wait for, but this goes too
        # fast against desktop builds causing intermittent failures
        time.sleep(0.2)

        li = self.wait_for_element_present(*_list_item_locator)

        # TODO Remove scrollintoView upon resolution of bug 877651
        self.marionette.execute_script(
            'arguments[0].scrollIntoView(false);', [li])
        li.tap()
        # no close button for this selection, select on an item brings to 
        # confirmation directly

        time.sleep(0.2)

        # Confirmation page shown upon selection is made
        self.wait_for_element_displayed(*self._confirm_suspended_locator)
        self.marionette.find_element(*self._confirm_suspended_locator).click()

        # now back to app
        self.apps.switch_to_displayed_app()

    @property
    def sim_for_outgoing_call (self):
        return self.marionette.find_element(*self._outgoing_call_locator).get_attribute('value') 

    @property
    def sim_for_outgoing_messages (self):
        return self.marionette.find_element(*self._outgoing_messages_locator).get_attribute('value') 

    @property
    def sim_for_data (self):
        return self.marionette.find_element(*self._outgoing_data_locator).get_attribute('value') 
