# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base, PageRegion
from gaiatest.form_controls.header import GaiaHeader


class RingTone(Base):
    name = 'Ringtones'
    manifest_url = '{}ringtones{}/manifest.webapp'.format(Base.DEFAULT_PROTOCOL, Base.DEFAULT_APP_HOSTNAME)

    _page_locator = (By.CLASS_NAME, 'theme-settings')
    _screen_locator = (By.ID, 'list-parent')
    _header_locator = (By.ID, 'header')
    _ring_tone_locator = (By.CSS_SELECTOR, '#list-parent section > ul > li')
    _set_button_locator = (By.ID, 'set')
    _save_button_locator = (By.ID, 'save')
    _ringtone_actions_shadow_dom_locator = (By.ID, 'ringtone-actions')
    _actions_cancel_locator = (By.CSS_SELECTOR, '.gaia-menu-cancel button')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_to_be_displayed()
        self.apps.switch_to_displayed_app()

        if self.is_element_present(*self._page_locator):
            Wait(marionette).until(lambda m: self.marionette.find_element(*self._page_locator).
                                   get_attribute('data-ready') == 'true')

    def set_ringtone(self):
        self.marionette.find_element(*self._set_button_locator).tap()

    def tap_save(self):
        save_button = self.marionette.find_element(*self._save_button_locator)
        Wait(self.marionette).until(lambda m: save_button.get_attribute('disabled') == 'false')
        save_button.tap()

    def tap_exit(self):
        GaiaHeader(self.marionette, self._header_locator).go_back(app=self,exit_app=True)

    def cancel_share(self):
        shadow = self.marionette.find_element(*self._ringtone_actions_shadow_dom_locator)
        self.marionette.switch_to_shadow_root(shadow)
        self.marionette.find_element(*self._actions_cancel_locator).tap()
        self.marionette.switch_to_shadow_root()

    @property
    def ring_tones(self):
        return [self.RingToneItem(self.marionette, item)
                for item in self.marionette.find_elements(*self._ring_tone_locator)]

    @property
    def screen_element(self):
        if self.is_element_present(*self._page_locator):
            return self.marionette.find_element(*self._screen_locator)

    class RingToneItem(PageRegion):
        _radio_button_locator = (By.CSS_SELECTOR, 'gaia-radio')
        _actions_button_locator = (By.CLASS_NAME, 'actions-button')

        @property
        def name(self):
            return self.root_element.text

        def select_ring_tone(self):
            self.root_element.find_element(*self._radio_button_locator).tap()

        def select_option(self):
            self.root_element.find_element(*self._actions_button_locator).tap()

