# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase
from gaiatest.apps.settings.app import Settings


class TestColorFiltersAccessibility(GaiaTestCase):

    def setUp(self):
        GaiaTestCase.setUp(self)

        # make accessibility settings visible
        self.data_layer.set_setting('accessibility.colors.enabled', False)
        self.data_layer.set_setting('accessibility.colors.invert', False)
        self.data_layer.set_setting('accessibility.colors.grayscale', False)
        self.data_layer.set_setting('accessibility.colors.contrast', 0.0)

        self.settings = Settings(self.marionette)
        self.settings.launch()

    def test_a11y_color_filters(self):
        accessibility_settings = self.settings.open_accessibility()
        colors_settings = accessibility_settings.a11y_open_color_settings()

        # make sure the actual settings are hidden
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *colors_settings._invert_switch_locator)))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *colors_settings._grayscale_switch_locator)))
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *colors_settings._contrast_slider_locator)))

        # turn on color filters
        colors_settings.a11y_toggle_filters()

        # the color settings should show up now
        self.wait_for_condition(lambda m: colors_settings.invert_switch_visible)
        self.wait_for_condition(lambda m: colors_settings.grayscale_switch_visible)
        self.wait_for_condition(
            lambda m: self.accessibility.is_visible(self.marionette.find_element(
                *colors_settings._contrast_slider_locator)))

        colors_settings.a11y_toggle_invert()

        # layers invert setting should be set
        self.wait_for_condition(
            lambda m: self.data_layer.get_setting('layers.effect.invert'))

        colors_settings.a11y_toggle_grayscale()

        # layers grayscale setting should be set
        self.wait_for_condition(
            lambda m: self.data_layer.get_setting('layers.effect.grayscale'))

        # turn off color filters
        colors_settings.a11y_toggle_filters()

        # layers settings should go back to default automatically
        self.wait_for_condition(
            lambda m: not self.data_layer.get_setting('layers.effect.invert'))
        self.wait_for_condition(
            lambda m: not self.data_layer.get_setting('layers.effect.grayscale'))

        # make sure the actual settings are hidden
        self.assertTrue(colors_settings.invert_switch_hidden)
        self.assertTrue(colors_settings.grayscale_switch_hidden)
        self.assertTrue(self.accessibility.is_hidden(self.marionette.find_element(
            *colors_settings._contrast_slider_locator)))
