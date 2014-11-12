# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.phone.app import Phone
from gaiatest.apps.base import PageRegion


class CallLog(Phone):

    _upgrade_progress_locator = (By.ID, 'call-log-upgrading')
    _call_log_edit_button_locator = (By.ID, 'call-log-icon-edit')

    _call_log_edit_dialog_locator = (By.ID, 'edit-mode')
    _call_log_edit_delete_button_locator = (By.ID, 'delete-button')
    _call_log_edit_close_button_locator = (By.ID, 'call-log-icon-close')
    _call_log_edit_deselect_all_button_locator = (By.ID, 'deselect-all-threads')
    _call_log_edit_select_all_button_locator = (By.ID, 'select-all-threads')

    _all_calls_tab_link_locator = (By.CSS_SELECTOR, '#all-filter a')
    _missed_calls_tab_link_locator = (By.CSS_SELECTOR, '#missed-filter a')
    _calls_list_item_locator = (By.CSS_SELECTOR, 'li.log-item')
    _all_calls_list_item_button_locator = (By.CSS_SELECTOR, 'li.log-item a')
    _all_calls_list_item_checkbox_locator = (By.CSS_SELECTOR, 'li.log-item input[type="checkbox"]')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)
        self.wait_for_element_not_displayed(*self._upgrade_progress_locator)
        self.wait_for_element_displayed(*self._all_calls_tab_link_locator)

    def tap_all_calls_tab(self):
        self.marionette.find_element(*self._all_calls_tab_link_locator).tap()

    def tap_missed_calls_tab(self):
        self.marionette.find_element(*self._missed_calls_tab_link_locator).tap()

    def a11y_click_all_calls_tab(self):
        self.accessibility.click(self.marionette.find_element(*self._all_calls_tab_link_locator))

    @property
    def is_all_calls_tab_selected(self):
        return self.marionette.find_element(*self._all_calls_tab_link_locator).get_attribute('aria-selected') == 'true'

    @property
    def is_missed_calls_tab_selected(self):
        return self.marionette.find_element(*self._missed_calls_tab_link_locator).get_attribute('aria-selected') == 'true'

    @property
    def call_list(self):
        return [LogEntries(self.marionette, element)
                for element in self.marionette.find_elements(*self._calls_list_item_locator)
                if element.is_displayed()]


class LogEntries(PageRegion):

    @property
    def phone_number(self):
        return self.root_element.text

    @property
    def call_type(self):
        return self.root_element.get_attribute('data-type')
