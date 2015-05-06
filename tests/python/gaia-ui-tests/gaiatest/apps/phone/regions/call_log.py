# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.errors import StaleElementException

from gaiatest.apps.phone.app import Phone
from gaiatest.apps.base import PageRegion


class CallLog(Phone):

    _upgrade_progress_locator = (By.ID, 'call-log-upgrading')
    _call_log_edit_button_locator = (By.ID, 'call-log-icon-edit')
    _call_log_header_locator = (By.ID, 'header-edit-mode-text')
    _no_logs_message_locator = (By.ID, 'no-result-msg1')

    _call_log_groups_locator = (By.CSS_SELECTOR, '#call-log-container section')

    _call_log_edit_dialog_locator = (By.ID, 'edit-mode')
    _call_log_edit_delete_button_locator = (By.ID, 'delete-button')
    _call_log_edit_close_button_locator = (By.ID, 'call-log-icon-close')
    _call_log_edit_deselect_all_button_locator = (By.ID, 'deselect-all-threads')
    _call_log_edit_select_all_button_locator = (By.ID, 'select-all-threads')

    _call_log_delete_confirmation_locator = (By.CSS_SELECTOR, 'button.danger[data-l10n-id="delete"]')

    _all_calls_tab_link_locator = (By.CSS_SELECTOR, '#all-filter a')
    _missed_calls_tab_link_locator = (By.CSS_SELECTOR, '#missed-filter a')
    _calls_list_item_locator = (By.CSS_SELECTOR, 'li.log-item')
    _all_calls_list_item_button_locator = (By.CSS_SELECTOR, 'li.log-item a')
    _all_calls_list_item_checkbox_locator = (By.CSS_SELECTOR, 'li.log-item input[type="checkbox"]')

    def __init__(self, marionette):
        Phone.__init__(self, marionette)
        Wait(self.marionette).until(
            expected.element_not_displayed(*self._upgrade_progress_locator))
        Wait(self.marionette).until(
            expected.element_displayed(*self._all_calls_tab_link_locator))

    def tap_all_calls_tab(self):
        self.marionette.find_element(*self._all_calls_tab_link_locator).tap()

    def tap_missed_calls_tab(self):
        self.marionette.find_element(*self._missed_calls_tab_link_locator).tap()

    def a11y_click_all_calls_tab(self):
        self.accessibility.click(self.marionette.find_element(*self._all_calls_tab_link_locator))

    def tap_edit_button(self):
        edit = Wait(self.marionette).until(
            expected.element_present(*self._call_log_edit_button_locator))
        Wait(self.marionette).until(expected.element_displayed(edit))
        edit.tap()

    def tap_select_all_button(self):
        # TODO Add a wait for the element to be displayed and a proper tap when Bug 1101504 is fixed
        Wait(self.marionette).until(expected.element_present(
            *self._call_log_edit_select_all_button_locator))
        self.marionette.execute_script('document.getElementById("%s").click()' %
                                       self._call_log_edit_select_all_button_locator[1])

    def tap_delete_button(self):
        # TODO Add a wait for the element to be displayed and a proper tap when Bug 1101504 is fixed
        Wait(self.marionette).until(expected.element_present(
            *self._call_log_edit_delete_button_locator))
        self.marionette.execute_script('document.getElementById("%s").click()' %
                                       self._call_log_edit_delete_button_locator[1])

    def tap_delete_confirmation_button(self):
        confirm = Wait(self.marionette).until(
            expected.element_present(*self._call_log_delete_confirmation_locator))
        Wait(self.marionette).until(expected.element_displayed(confirm))
        confirm.tap()

        Wait(self.marionette, ignored_exceptions=StaleElementException).until(
            lambda m: len(self.call_list) == 0)

    @property
    def header_text(self):
        return self.marionette.find_element(*self._call_log_header_locator).text

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

    @property
    def groups_list(self):
        return [LogGroups(self.marionette, element)
                for element in self.marionette.find_elements(*self._call_log_groups_locator)
                if element.is_displayed()]

    @property
    def no_logs_message(self):
        return self.marionette.find_element(*self._no_logs_message_locator).text


class LogGroups(PageRegion):

    _group_header_locator = (By.CSS_SELECTOR, 'header')
    _calls_list_item_locator = (By.CSS_SELECTOR, 'li.log-item')

    @property
    def header_text(self):
        return self.root_element.find_element(*self._group_header_locator).text

    @property
    def group_calls(self):
        return [LogEntries(self.marionette, element)
                for element in self.root_element.find_elements(*self._calls_list_item_locator)
                if element.is_displayed()]


class LogEntries(PageRegion):

    _edit_mode_checkbox_locator = (By.CSS_SELECTOR, '.call-log-selection input')
    _phone_number_locator = (By.CSS_SELECTOR, 'span.primary-info-main')
    _retry_count_locator = (By.CSS_SELECTOR, 'span.retry-count')

    @property
    def phone_number(self):
        return self.root_element.find_element(*self._phone_number_locator).text

    @property
    def retry_count(self):
        # return the retry count after trimming the parentheses from before and after the value
        return self.root_element.find_element(*self._retry_count_locator).text[1:-1]

    @property
    def call_type(self):
        return self.root_element.get_attribute('data-type')

    @property
    def is_checked(self):
        return self.root_element.find_element(*self._edit_mode_checkbox_locator).is_selected()
