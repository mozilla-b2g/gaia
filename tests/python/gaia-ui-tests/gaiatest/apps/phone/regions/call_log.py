# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.phone.app import Phone


class CallLog(Phone):

    _upgrade_progress_locator = (By.ID, 'call-log-upgrading')
    _call_log_edit_button_locator = (By.ID, 'call-log-icon-edit')

    _call_log_edit_dialog_locator = (By.ID, 'edit-mode')
    _call_log_edit_delete_button_locator = (By.ID, 'delete-button')
    _call_log_edit_close_button_locator = (By.ID, 'call-log-icon-close')
    _call_log_edit_deselect_all_button_locator = (By.ID, 'deselect-all-threads')
    _call_log_edit_select_all_button_locator = (By.ID, 'select-all-threads')

    _all_calls_tab_link_locator = (By.CSS_SELECTOR, '#all-filter a')
    _all_calls_list_item_locator = (By.CSS_SELECTOR, 'li.log-item')
    _all_calls_list_item_button_locator = (By.CSS_SELECTOR, 'li.log-item a')
    _all_calls_list_item_checkbox_locator = (By.CSS_SELECTOR, 'li.log-item input[type="checkbox"]')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)
        self.wait_for_element_not_displayed(*self._upgrade_progress_locator)
        self.wait_for_element_displayed(*self._all_calls_tab_link_locator)

    def tap_all_calls_tab(self):
        self.marionette.find_element(*self._all_calls_tab_link_locator).tap()

    def a11y_click_all_calls_tab(self):
        self.accessibility.click(self.marionette.find_element(*self._all_calls_tab_link_locator))

    @property
    def is_all_calls_tab_selected(self):
        return self.marionette.find_element(*self._all_calls_tab_link_locator).get_attribute('aria-selected') == 'true'

    @property
    def all_calls_count(self):
        return len(self._all_calls)

    @property
    def first_all_call_text(self):
        return self._all_calls[0].text

    # TODO: Add a subregion for each call in the call log, when we have tests that need to work with more than 1 call
    @property
    def _all_calls(self):
        return self.marionette.find_elements(*self._all_calls_list_item_locator)
