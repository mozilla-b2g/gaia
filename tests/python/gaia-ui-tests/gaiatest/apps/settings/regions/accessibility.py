# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import By

from gaiatest.apps.base import Base


class Accessibility(Base):

    _accessibility_screenreader_menu_item_locator = (
        By.CSS_SELECTOR, '[href="#accessibility-screenreader"]')
    _accessibility_colors_menu_item_locator = (
        By.CSS_SELECTOR, '[href="#accessibility-colors"]')

    def a11y_open_screenreader_settings(self):
        el = self.marionette.find_element(
          *self._accessibility_screenreader_menu_item_locator)
        self.accessibility.click(el)
        return AccessibilityScreenreader(self.marionette)

    def a11y_open_color_settings(self):
        el = self.marionette.find_element(
          *self._accessibility_colors_menu_item_locator)
        self.accessibility.click(el)
        return AccessibilityColors(self.marionette)

class AccessibilityScreenreader(Base):

    _screen_reader_captions_locator = (
        By.CSS_SELECTOR, 'input[name="accessibility.screenreader-captions"]')
    _screen_reader_volume_slider_locator = (
        By.CSS_SELECTOR, 'input[name="accessibility.screenreader-volume"]')
    _screen_reader_rate_slider_locator = (
        By.CSS_SELECTOR, 'input[name="accessibility.screenreader-rate"]')

    def a11y_toggle_captions(self):
        self.accessibility.click(self.marionette.find_element(
            *self._screen_reader_captions_locator))


class AccessibilityColors(Base):

    _filter_enable_switch_locator = (
      By.CSS_SELECTOR, 'input[name="accessibility.colors.enable"]')
    _invert_switch_locator = (
      By.CSS_SELECTOR, 'input[name="accessibility.colors.invert"]')
    _grayscale_switch_locator = (
      By.CSS_SELECTOR, 'input[name="accessibility.colors.grayscale"]')
    _contrast_slider_locator = (
      By.CSS_SELECTOR, 'input[name="accessibility.colors.contrast"]')

    def a11y_toggle_filters(self):
        el = self.marionette.find_element(*self._filter_enable_switch_locator)
        self.accessibility.click(el)

    def a11y_toggle_invert(self):
        el = self.marionette.find_element(*self._invert_switch_locator)
        self.accessibility.click(el)

    def a11y_toggle_grayscale(self):
        el = self.marionette.find_element(*self._grayscale_switch_locator)
        self.accessibility.click(el)
