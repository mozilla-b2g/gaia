# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestCalculator(GaiaTestCase):
    def test_calculator_basic(self):
        # unlock the lockscreen if it's locked
        self.assertTrue(self.lockscreen.unlock())

        # launch the Calculator app
        app = self.apps.launch('Calculator')
        self.assertTrue(app.frame_id is not None)

        # switch into the Calculator's frame
        self.marionette.switch_to_frame(app.frame_id)
        url = self.marionette.get_url()
        self.assertTrue('calculator' in url, 'wrong url: %s' % url)

        # clear the calculator's display
        element = self.marionette.find_element('xpath', '//*[@value="C"]')
        element.click()

        # perform a 3*5 calculation
        element = self.marionette.find_element('xpath', '//*[@value="3"]')
        element.click()
        element = self.marionette.find_element('id', 'multiply')
        element.click()
        element = self.marionette.find_element('xpath', '//*[@value="5"]')
        element.click()
        element = self.marionette.find_element('xpath', '//*[@value="="]')
        element.click()

        # verify the result
        display = self.marionette.find_element('id', 'display')
        self.assertEquals(display.text, '15', 'wrong calculated value!')

        # close the app
        self.apps.kill(app)
