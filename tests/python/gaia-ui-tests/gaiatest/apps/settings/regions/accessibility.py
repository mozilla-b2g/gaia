# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class Accessibility(Base):

    _accessibility_screenreader_menu_item_locator = (
        By.CSS_SELECTOR, '[href="#accessibility-screenreader"]')
    _accessibility_colors_menu_item_locator = (
        By.CSS_SELECTOR, '[href="#accessibility-colors"]')
    _accessibility_audio_menu_item_locator = (
        By.CSS_SELECTOR, '[href="#accessibility-audio"]')
    _accessibility_input_menu_item_locator = (
        By.CSS_SELECTOR, '[href="#accessibility-input"]')
    _page_locator = (By.ID, 'accessibility')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

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

    def open_color_settings(self): #non-a11y method
        self.marionette.find_element(*self._accessibility_colors_menu_item_locator).tap()
        return AccessibilityColors(self.marionette)

    def open_audio_settings(self):
        self.marionette.find_element(*self._accessibility_audio_menu_item_locator).tap()
        return AccessibilityAudio(self.marionette)

    def open_input_settings(self):
        self.marionette.find_element(*self._accessibility_input_menu_item_locator).tap()
        return AccessibilityInput(self.marionette)

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

    _page_locator = (By.ID, 'accessibility-colors')
    _filter_enable_switch_locator = (
        By.CSS_SELECTOR, '[name="accessibility.colors.enable"]')
    _invert_switch_locator = (
        By.CSS_SELECTOR, '[name="accessibility.colors.invert"]')
    _grayscale_switch_locator = (
        By.CSS_SELECTOR, '[name="accessibility.colors.grayscale"]')
    _contrast_slider_locator = (
        By.CSS_SELECTOR, 'input[name="accessibility.colors.contrast"]')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def invert_switch_visible(self):
        return self.check_switch_for_a11y_state("isVisible", self.marionette.find_element(
            *self._invert_switch_locator))

    @property
    def grayscale_switch_visible(self):
        return self.check_switch_for_a11y_state("isVisible", self.marionette.find_element(
            *self._grayscale_switch_locator))

    @property
    def invert_switch_hidden(self):
        return self.check_switch_for_a11y_state("isHidden", self.marionette.find_element(
            *self._invert_switch_locator))

    @property
    def grayscale_switch_hidden(self):
        return self.check_switch_for_a11y_state("isHidden", self.marionette.find_element(
            *self._grayscale_switch_locator))

    def check_switch_for_a11y_state(self, state, switch):
        return self.accessibility.execute_async_script("""return Accessibility.%s(
                arguments[0].shadowRoot.querySelector('#switch-label'));""" % state, [switch])

    def a11y_toggle_switch(self, switch):
        return self.accessibility.execute_async_script(
            "Accessibility.click(arguments[0].shadowRoot.querySelector('#switch-label'));",
            [switch])

    def a11y_toggle_filters(self):
        self.a11y_toggle_switch(self.marionette.find_element(*self._filter_enable_switch_locator))

    def toggle_filters(self):
        element = self.marionette.find_element(*self._filter_enable_switch_locator)
        Wait(self.marionette).until(
            expected.element_displayed(element))
        element.tap()

    def a11y_toggle_invert(self):
        self.a11y_toggle_switch(self.marionette.find_element(*self._invert_switch_locator))

    def a11y_toggle_grayscale(self):
        self.a11y_toggle_switch(self.marionette.find_element(*self._grayscale_switch_locator))


class AccessibilityAudio(Base):

    _page_locator = (By.ID, 'accessibility-audio')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)


class AccessibilityInput(Base):

    _page_locator = (By.ID, 'accessibility-input')
    _delay_locator =(By.CSS_SELECTOR, '[name="ui.click_hold_context_menus.delay"]')
    _confirm_delay_change_locator =(By.CSS_SELECTOR, 'button[data-l10n-id="ok"]')

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    def tap_change_delay(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._delay_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._confirm_delay_change_locator))

    def tap_confirm_delay(self):
        element = Wait(self.marionette).until(
            expected.element_present(*self._confirm_delay_change_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._delay_locator))
