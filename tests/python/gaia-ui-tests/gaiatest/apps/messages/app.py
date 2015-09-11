# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion


class Messages(Base):

    name = 'Messages'

    _create_new_message_locator = (By.ID, 'threads-composer-link')
    _first_message_locator = (By.ID, 'thread-1')
    _messages_frame_locator = (By.CSS_SELECTOR, 'iframe[data-url*=sms]')
    _settings_icon_locator = (By.ID, 'threads-settings-button')
    _app_ready_locator = (By.CLASS_NAME, 'js-app-ready')
    _thread_items_locator = (By.CSS_SELECTOR, 'li.threadlist-item')
    _draft_message_locator = (By.CSS_SELECTOR, 'li.draft')
    _thread_options_button = (By.ID, 'threads-options-button')
    _delete_thread_button = (By.ID, 'threads-delete-button')
    _edit_thread_header = (By.ID, 'threads-edit-header')
    _banner_locator = (By.ID, 'threads-draft-saved-banner')

    def launch(self):
        Base.launch(self)
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._app_ready_locator))))

    def create_new_message(self, recipients, message):
        new_message = self.tap_create_new_message()
        for recipient in recipients:
            new_message.type_phone_number(recipient)
        new_message.type_message(message)
        return new_message

    def tap_create_new_message(self):
        self.marionette.find_element(*self._create_new_message_locator).tap()
        from gaiatest.apps.messages.regions.new_message import NewMessage
        return NewMessage(self.marionette)

    def tap_settings(self):
        self.marionette.find_element(*self._settings_icon_locator).tap()
        Wait(self.marionette).until(lambda m: self.apps.displayed_app.name == 'Settings')
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

    def tap_thread_options(self):
        self.marionette.find_element(*self._thread_options_button).tap()
        from gaiatest.apps.messages.regions.options import ThreadOptions
        return ThreadOptions(self.marionette)

    def enter_select_mode(self):
        thread_options = self.tap_thread_options()
        thread_options.select_threads()
        self.wait_for_header_to_fully_appear()

    def wait_for_header_to_fully_appear(self):
        edit_header = self.marionette.find_element(*self._edit_thread_header)
        Wait(self.marionette).until(lambda m: edit_header.is_displayed() and edit_header.rect['y'] == 0)

    @property
    def is_in_select_mode(self):
        return self.marionette.find_element(*self._edit_thread_header).is_displayed()

    def delete_selection(self):
        confirm_panel = self.tap_delete_button()
        confirm_panel.confirm_delete()

    def tap_delete_button(self):
        self.marionette.find_element(*self._delete_thread_button).tap()
        from gaiatest.apps.messages.regions.options import ConfirmDeletionOptions
        return ConfirmDeletionOptions(self.marionette)

    def wait_for_banner_to_hide(self):
        Wait(self.marionette).until(expected.element_not_displayed(*self._banner_locator))

    @property
    def threads(self):
        return [self.Thread(self.marionette, message)
                for message in self.marionette.find_elements(*self._thread_items_locator)]

    @property
    def draft_threads(self):
        return [self.Thread(self.marionette, draft_message)
                for draft_message in self.marionette.find_elements(*self._draft_message_locator)]

    class Thread(PageRegion):
        _draft_icon_locator = (By.CSS_SELECTOR, '.icon-draft[data-l10n-id="is-draft"]')

        @property
        def is_draft_icon_displayed(self):
            return self.root_element.find_element(*self._draft_icon_locator).is_displayed()

        def open(self):
            self.root_element.tap()
            from gaiatest.apps.messages.regions.new_message import NewMessage
            return NewMessage(self.marionette)

        def choose(self):
            self.root_element.tap()
