# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import time

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base


class DeviceInfo(Base):

    _page_locator = (By.ID, 'about')
    _phone_number_locator = (By.CSS_SELECTOR, '.deviceInfo-msisdns')
    _model_locator = (By.CSS_SELECTOR, '#about small[data-name="deviceinfo.product_model"]')
    _software_locator = (By.CSS_SELECTOR, '#about small[data-name="deviceinfo.software"]')
    _your_rights_locator = (By.CSS_SELECTOR, '[data-l10n-id="your-rights"]')
    _rights_page_locator = (By.ID, 'about-yourRights')
    _your_privacy_locator = (By.CSS_SELECTOR, '[data-l10n-id="your-privacy"]')
    _privacy_page_header_locator = (By.CSS_SELECTOR, '[data-l10n-id="your-privacy-header"]')
    _legal_page_locator = (By.ID, 'about-legal')
    _legal_info_locator = (By.CSS_SELECTOR, '[data-l10n-id="about-legal-info"]')
    _open_source_notices_locator = (By.CSS_SELECTOR, '[data-l10n-id="open-source-notices"]')
    _notice_page_locator = (By.ID, 'about-licensing')
    _notice_text_locator = (By.ID, 'os-license')
    _source_text_locator = (By.ID, 'obtain-sc')
    _obtaining_source_code_locator = (By.CSS_SELECTOR, '[data-l10n-id="obtaining-source-code"]')
    _source_code_page_locator = (By.ID, 'about-source-code')
    _more_info_button_locator = (By.CSS_SELECTOR, 'a[href="#about-moreInfo"]')
    _reset_button_locator = (By.CLASS_NAME, 'reset-phone')
    _reset_confirm_locator = (By.CLASS_NAME, 'confirm-reset-phone')
    _reset_cancel_locator = (By.CLASS_NAME, 'cancel-reset-phone')
    _update_frequency_locator = (By.NAME, 'app.update.interval')
    _update_ok_button_locator = (By.CLASS_NAME, 'value-option-confirm')

    def __init__(self, marionette):
        Base.__init__(self, marionette)
        Wait(self.marionette).until(
            expected.element_displayed(*self._model_locator))

    @property
    def screen_element(self):
        return self.marionette.find_element(*self._page_locator)

    @property
    def rights_screen_element(self):
        return self.marionette.find_element(*self._rights_page_locator)

    @property
    def legal_screen_element(self):
        return self.marionette.find_element(*self._legal_page_locator)

    @property
    def phone_number(self):
        return self.marionette.find_element(*self._phone_number_locator).text

    @property
    def model(self):
        return self.marionette.find_element(*self._model_locator).text

    @property
    def software(self):
        return self.marionette.find_element(*self._software_locator).text

    def tap_your_rights(self):
        element = self.marionette.find_element(*self._your_rights_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._rights_page_locator))

    def tap_your_privacy(self):
        element = self.marionette.find_element(*self._your_privacy_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._privacy_page_header_locator))

    def tap_legal_info(self):
        element = self.marionette.find_element(*self._legal_info_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._open_source_notices_locator))

    def tap_open_source_notices(self):
        element = self.marionette.find_element(*self._open_source_notices_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        iframe = self.marionette.find_element(*self._notice_text_locator)
        Wait(self.marionette).until(expected.element_displayed(iframe))
        self.marionette.switch_to_frame(iframe)
        _last_child_locator = (By.CSS_SELECTOR, 'body > *:last-child')
        Wait(self.marionette).until(expected.element_displayed(*_last_child_locator))
        self.apps.switch_to_displayed_app()

    def tap_obtaining_source_code(self):
        element = self.marionette.find_element(*self._obtaining_source_code_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        iframe = self.marionette.find_element(*self._source_text_locator)
        Wait(self.marionette).until(expected.element_displayed(iframe))
        self.marionette.switch_to_frame(iframe)
        _last_child_locator = (By.CSS_SELECTOR, 'body > *:last-child')
        Wait(self.marionette).until(expected.element_displayed(*_last_child_locator))
        self.apps.switch_to_displayed_app()

    def tap_more_info(self):
        element = self.marionette.find_element(*self._more_info_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        return self.MoreInfo(self.marionette)

    # In order to access UI, the frame needs to be switched to root
    def tap_update_frequency(self):
        element = self.marionette.find_element(*self._update_frequency_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.marionette.switch_to_frame()
        Wait(self.marionette).until(expected.element_displayed(*self._update_ok_button_locator))

    # When leaving the page, return to the saved application frame
    def exit_update_frequency(self):
        element = self.marionette.find_element(*self._update_ok_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        self.apps.switch_to_displayed_app()
        Wait(self.marionette).until(expected.element_displayed(*self._page_locator))

    def tap_reset_phone(self):
        element = self.marionette.find_element(*self._reset_button_locator)
        Wait(self.marionette).until(expected.element_displayed(element))
        element.tap()
        Wait(self.marionette).until(expected.element_displayed(*self._reset_confirm_locator))

    def confirm_reset(self, response=True):
        if response is True:
            self.marionette.find_element(*self._reset_confirm_locator).tap()
        else:
            self.marionette.find_element(*self._reset_cancel_locator).tap()
            Wait(self.marionette).until(expected.element_displayed(self.screen_element))

    class MoreInfo(Base):

        _more_information_page_locator = (By.ID, 'about-moreInfo')
        _os_version_locator = (By.CSS_SELECTOR, '#about-moreInfo small[data-name="deviceinfo.os"]')
        _hardware_revision_locator = (By.CSS_SELECTOR, '#about-moreInfo small[data-name="deviceinfo.hardware"]')
        _mac_address_locator = (By.CSS_SELECTOR, '#about-moreInfo small[data-name="deviceinfo.mac"]')
        _imei1_locator = (By.CSS_SELECTOR, '.deviceInfo-imeis span[data-slot="0"]')
        _imei2_locator = (By.CSS_SELECTOR, '.deviceInfo-imeis span[data-slot="1"]')
        _iccid_locator = (By.CSS_SELECTOR, '.deviceInfo-iccids')
        _platform_version_locator = (By.CSS_SELECTOR, '#about-moreInfo small[data-name="deviceinfo.platform_version"]')
        _build_id_locator = (By.CSS_SELECTOR, '#about-moreInfo small[data-name="deviceinfo.platform_build_id"]')
        _build_number_locator = (By.CSS_SELECTOR, '#about-moreInfo small[data-name="deviceinfo.build_number"]')
        _update_channel_locator = (By.CSS_SELECTOR, '#about-moreInfo small[data-name="app.update.channel"]')
        _git_commit_timestamp_locator = (By.CSS_SELECTOR, '.gaia-commit-date')
        _git_commit_hash_locator = (By.CSS_SELECTOR, '.gaia-commit-hash')

        def __init__(self, marionette):
            Base.__init__(self, marionette)
            Wait(self.marionette).until(
                expected.element_displayed(*self._os_version_locator))

        @property
        def screen_element(self):
            return self.marionette.find_element(*self._more_information_page_locator)

        @property
        def os_version(self):
            return self.marionette.find_element(*self._os_version_locator).text

        @property
        def hardware_revision(self):
            return self.marionette.find_element(*self._hardware_revision_locator).text

        @property
        def mac_address(self):
            return self.marionette.find_element(*self._mac_address_locator).text

        @property
        def imei1(self):
            return self.marionette.find_element(*self._imei1_locator).text.split()[2]

        @property
        def imei2(self):
            return self.marionette.find_element(*self._imei2_locator).text.split()[2]

        @property
        def iccid(self):
            return self.marionette.find_element(*self._iccid_locator).text

        @property
        def platform_version(self):
            return self.marionette.find_element(*self._platform_version_locator).text

        @property
        def build_id(self):
            return self.marionette.find_element(*self._build_id_locator).text

        @property
        def build_number(self):
            return self.marionette.find_element(*self._build_number_locator).text

        @property
        def update_channel(self):
            return self.marionette.find_element(*self._update_channel_locator).text

        @property
        def git_commit_timestamp(self):
            return self.marionette.find_element(*self._git_commit_timestamp_locator).text

        @property
        def git_commit_hash(self):
            return self.marionette.find_element(*self._git_commit_hash_locator).text
