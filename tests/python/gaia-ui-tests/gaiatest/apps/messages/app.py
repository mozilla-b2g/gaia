# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Messages(Base):

    name = 'Messages'
    origin = 'app://sms.gaiamobile.org'

    _create_new_message_locator = (By.ID, 'threads-composer-link')
    _first_message_locator = (By.ID, 'thread-1')
    _messages_frame_locator = (By.CSS_SELECTOR, 'iframe[data-url*=sms]')
    _settings_icon_locator = (By.ID, 'threads-settings-button')
    _app_ready_locator = (By.CLASS_NAME, 'js-app-ready')
    _draft_message_locator = (By.CSS_SELECTOR, 'li.draft')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._app_ready_locator))))

    def tap_create_new_message(self):
        self.marionette.find_element(*self._create_new_message_locator).tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_icon_locator).tap()
        from gaiatest.apps.settings.app import Settings
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.origin == Settings.origin)
        self.apps.switch_to_displayed_app()
        from gaiatest.apps.messages.regions.messaging_settings import MessagingSettings
        return MessagingSettings(self.marionette)

    def wait_for_message_list(self):
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._create_new_message_locator))))

    def wait_for_message_received(self, timeout=180):
        Wait(self.marionette, timeout).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._first_message_locator))))

    def tap_first_received_message(self):
        self.marionette.find_element(*self._first_message_locator).tap()
        from gaiatest.apps.messages.regions.message_thread import MessageThread
        return MessageThread(self.marionette)

    @property
    def draft_message(self):
        return [DraftMessage(self.marionette, draft_message)
                for draft_message in self.marionette.find_elements(*self._draft_message_locator)]


class DraftMessage(PageRegion):
    _draft_icon_locator = (By.CSS_SELECTOR, '.icon-draft[data-l10n-id="is-draft"]')

    @property
    def is_draft_icon_displayed(self):
        return self.root_element.find_element(*self._draft_icon_locator).is_displayed()

    def tap_draft_message(self):
        self.root_element.tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)
