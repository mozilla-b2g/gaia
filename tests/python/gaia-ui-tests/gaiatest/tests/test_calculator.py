# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCalculator(GaiaTestCase):

    _display_locator = ('id', 'display')
    _multiply_button_locator = ('id', 'multiply')
    _clear_button_locator = ('xpath', "//input[@value='C']")
    _equals_button_locator = ('xpath', "//input[@value='=']")
    _three_button_locator = ('xpath', "//input[@value='3']")
    _five_button_locator = ('xpath', "//input[@value='5']")

    def setUp(self):
        GaiaTestCase.setUp(self)

        # launch the Calculator app
        self.app = self.apps.launch('Calculator')

    def test_calculator_basic(self):
        # https://moztrap.mozilla.org/manage/case/2844/

        # wait for the elements to show up
        self.wait_for_element_displayed(*self._clear_button_locator)

        # clear the calculator's display
        clear_button = self.marionette.find_element(*self._clear_button_locator)
        self.marionette.tap(clear_button)

        # perform a 3*5 calculation
        self.marionette.tap(*self._three_button_locator)
        self.marionette.tap(*self._multiply_button_locator)
        self.marionette.tap(*self._five_button_locator)
        self.marionette.tap(*self._equals_button_locator)

        # verify the result
        display = self.marionette.find_element(*self._display_locator)
        self.assertEquals(display.text, '15', 'wrong calculated value!')
