# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class FmRadio(Base):
    name = 'FM Radio'

    _power_button_locator = (By.ID, 'power-switch')
    _favorite_list_locator = (By.CSS_SELECTOR, 'div.fav-list-item')
    _frequency_display_locator = (By.ID, 'frequency')
    _frequency_dialer_locator = (By.ID, 'frequency-dialer')
    _favorite_button_locator = (By.ID, 'bookmark-button')
    _next_button_locator = (By.ID, 'frequency-op-seekup')
    _prev_button_locator = (By.ID, 'frequency-op-seekdown')

    def flick_frequency_dialer_up(self):
        dialer = self.marionette.find_element(*self._frequency_dialer_locator)

        dialer_x_center = int(dialer.size['width'] / 2)
        dialer_y_center = int(dialer.size['height'] / 2)
        Actions(self.marionette).flick(dialer, dialer_x_center, dialer_y_center, 0, 800, 800).perform()

    def tap_next(self):
        current_frequency = self.frequency
        self.marionette.find_element(*self._next_button_locator).tap()
        self.wait_for_condition(lambda m: self.frequency != current_frequency)

    def tap_previous(self):
        current_frequency = self.frequency
        self.marionette.find_element(*self._prev_button_locator).tap()
        self.wait_for_condition(lambda m: self.frequency != current_frequency)

    def tap_power_button(self):
        self.marionette.find_element(*self._power_button_locator).tap()

    def wait_for_radio_off(self):
        self.wait_for_condition(lambda m: self.is_power_button_on is False)

    def tap_add_favorite(self):
        current_favorite_channel_count = len(self.favorite_channels)
        self.marionette.find_element(*self._favorite_button_locator).tap()
        self.wait_for_condition(lambda m: current_favorite_channel_count + 1 == len(self.favorite_channels))

    @property
    def is_power_button_on(self):
        return self.marionette.find_element(*self._power_button_locator).get_attribute('data-enabled') == 'true'

    @property
    def frequency(self):
        return float(self.marionette.find_element(*self._frequency_display_locator).text)

    @property
    def favorite_channels(self):
        return [self.FavoriteChannel(self.marionette, channel) for channel in self.marionette.find_elements(*self._favorite_list_locator)]

    class FavoriteChannel(PageRegion):
        _remove_locator = (By.CSS_SELECTOR, 'div.fav-list-remove-button')
        _frequency_locator = (By.CSS_SELECTOR, 'div.fav-list-frequency')

        @property
        def text(self):
            return float(self.root_element.find_element(*self._frequency_locator).text)

        def remove(self):
            self.root_element.find_element(*self._remove_locator).tap()
            self.wait_for_element_not_present(*self._frequency_locator)
