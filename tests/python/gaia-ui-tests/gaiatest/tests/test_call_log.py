# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
import unittest


class TestCallLog(GaiaTestCase):

    _recent_calls_toolbar_button_locator = ('id', 'option-recents')

    _all_call_log_tab_locator = ('id', 'allFilter')
    _missed_call_log_tab_locator = ('id', 'missedFilter')

    _all_calls_list_item = ('css selector', 'li.log-item')
    _missed_call_list_item = (
        'css selector', "li.log-item[data-type='incoming-refused']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # TODO insert call data before the test
        # This test will fail if no calls have been made

        # launch the app
        self.app = self.apps.launch('Phone')

    def test_call_log_all_calls(self):
        # https://moztrap.mozilla.org/manage/case/1306/

        self.wait_for_element_displayed(
            *self._recent_calls_toolbar_button_locator)

        self.marionette.find_element(
            *self._recent_calls_toolbar_button_locator).click()

        self.wait_for_element_displayed(*self._all_call_log_tab_locator)

        all_calls_tab = self.marionette.find_element(
            *self._all_call_log_tab_locator)
        all_calls_tab.click()

        # Check that 'All calls' tab is selected
        self.assertEqual(all_calls_tab.get_attribute('class'), 'selected')

        # Now check that at least one call is listed.
        all_calls = self.marionette.find_elements(*self._all_calls_list_item)

        self.assertGreater(len(all_calls), 0)

        # Check that the first one is displayed. this is only a smoke test after all
        self.assertTrue(all_calls[0].is_displayed())

    def test_call_log_missed_calls(self):
        # https://moztrap.mozilla.org/manage/case/1306/

        self.wait_for_element_displayed(
            *self._recent_calls_toolbar_button_locator)

        self.marionette.find_element(
            *self._recent_calls_toolbar_button_locator).click()
        self.wait_for_element_displayed(*self._missed_call_log_tab_locator)

        missed_calls_tab = self.marionette.find_element(
            *self._missed_call_log_tab_locator)
        missed_calls_tab.click()

        # Check that 'Missed' tab is selected
        self.assertEqual(missed_calls_tab.get_attribute('class'), 'selected')

        # Now check that at least one call is listed.
        missed_calls = self.marionette.find_elements(
            *self._missed_call_list_item)

        self.assertGreater(len(missed_calls), 0)

        # Check that the first one is displayed. this is only a smoke test after all
        self.assertTrue(missed_calls[0].is_displayed())
