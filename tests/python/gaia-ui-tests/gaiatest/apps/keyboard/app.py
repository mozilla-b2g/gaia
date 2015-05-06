# -*- coding: UTF-8 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait
from marionette_driver.marionette import Actions

from gaiatest.apps.base import Base
from gaiatest.apps.system.app import System


class Keyboard(Base):
    '''
    There are two underlying strategies in this class;

    * send() method which uses logic to traverse the keyboard to type the
      string sent to it. Send should be used in tests where the layout of the
      keyboard is not tested and only string input is important
    * tap_x() or anything not send() methods which do not use logic to change
      keyboard panels. Tap should be used where the keyboard is expected to
      open with that key visible

    The methods in this class employ a lot of aggressive frame switching to the keyboard and back to the
    displayed app because it predominantly acts as a utility class and thus it works best when the main focus
    of the test is on the web app rather than the keyboard itself.
        '''

    name = "Keyboard"

    # special characters look-up table in English standard keyboard
    lookup_table = {'0': 'º',
                    '?': '¿',
                    '$': '€£¥',
                    '!': '¡',
                    'a': 'áàâäåãāæ',
                    'c': 'çćč',
                    'e': 'éèêëēę€ɛ',
                    'i': 'įīîìíï',
                    'l': '£ł',
                    'n': 'ńñ',
                    'o': 'ɵøœōôòóö',
                    's': 'ßśš$',
                    'u': 'ūûùúü',
                    'y': '¥ÿ',
                    'z': 'žźż',
                    'A': 'ÁÀÂÄÅÃĀÆ',
                    'C': 'ÇĆČ',
                    'E': 'ÉÈÊËĒĘ€Ɛ',
                    'I': 'ĮĪÎÌÍÏ',
                    'L': '£Ł',
                    'N': 'ŃÑ',
                    'O': 'ƟØŒŌÔÒÓÖ',
                    'S': 'ŚŠŞ',
                    'U': 'ŪÛÙÚÜ',
                    'Y': '¥Ÿ',
                    'Z': 'ŽŹŻ'}

    # keyboard table
    keyboard_table = ['english',
                      'dvorak',
                      'otherlatins',
                      'cyrillic',
                      'arabic',
                      'hebrew',
                      'zhuyin',
                      'pinyin',
                      'greek',
                      'japanese',
                      'portuguese',
                      'spanish']

    # special keys locators
    _language_key_locator = (By.CSS_SELECTOR, ".keyboard-type-container[data-active='true'] .keyboard-row button[data-keycode='-3']")
    _dotcom_key_locator = (By.CSS_SELECTOR, ".keyboard-row button[data-compositekey='.com']")
    _page_switching_key_locator = (By.CSS_SELECTOR, '.keyboard-type-container[data-active] button.keyboard-key[data-target-page="%s"]')
    _backspace_key = '8'
    _enter_key = '13'
    _alt_key = '18'
    _upper_case_key = '20'
    _space_key = '32'

    # keyboard app locators
    _keyboard_active_frame_locator = (By.CSS_SELECTOR, '#keyboards .inputWindow.active iframe')
    _input_window_locator = (By.CSS_SELECTOR, '#keyboards .inputWindow')
    _button_locator = (By.CSS_SELECTOR, '.keyboard-type-container[data-active] button.keyboard-key[data-keycode="%s"], .keyboard-type-container[data-active] button.keyboard-key[data-keycode-upper="%s"]')
    _highlight_key_locator = (By.CSS_SELECTOR, '#keyboard-accent-char-menu button')
    _predicted_word_locator = (By.CSS_SELECTOR, '.autocorrect')
    _candidate_panel_locator = (By.CSS_SELECTOR, '.keyboard-candidate-panel')
    _suggestions_container_locator = (By.CSS_SELECTOR, '.suggestions-container')
    _dismiss_suggestions_button_locator = (By.CSS_SELECTOR, '.dismiss-suggestions-button')

    # find the key to long press and return
    def _find_key_for_longpress(self, input_value):
        for key_to_press, extended_values in self.lookup_table.iteritems():
            if input_value in extended_values:
                return key_to_press

    # Try to switch to the correct layout. There are 3 keyboard layers:
    # Basic (layoutPage = 0), Alternate (layoutPage = 1) and Symbol (layoutPage = 2)
    def _switch_to_correct_layout(self, val):
        if val.isspace() or val in [',', '.']:
            # certain keys are available on every keyboard panel
            pass
        # Alphabetic keys available on the basic page
        elif val.isalpha():
            is_upper_case = self._is_upper_case
            # If the key to press isalpha and the keyboard layout is not, go back to Basic
            if not self._layout_page == 0:
                self._tap_page_switching_key(0)
                Wait(self.marionette).until(lambda m: self._layout_page == 0)
            # If the key to press isupper and the keyboard is not (or vice versa) then press shift
            if not val.isupper() == is_upper_case:
                self._tap(self._upper_case_key)
                Wait(self.marionette).until(lambda m: is_upper_case != self._is_upper_case)
        # Numbers and symbols are in other keyboard panels
        else:
            # If it's not space or alpha then it must be in Alternate or Symbol.
            # It can't be in Basic so let's go into Alternate and then try to find it
            if self._layout_page == 0 and not self._current_input_type == 'number' and not self._current_input_mode == 'numeric':
                self._tap_page_switching_key(1)
                page_0_key_locator = (self._page_switching_key_locator[0], self._page_switching_key_locator[1] % (0))
                Wait(self.marionette).until(expected.element_displayed(*page_0_key_locator))
            # If it is not present here then it must be in the other non-Basic page
            # (since we must be in either Alternate or Symbol at this stage)
            if not self.is_element_present(*self._key_locator(val)):
                if self._layout_page == 1:
                    self._tap_page_switching_key(2)
                    page_1_key_locator = (self._page_switching_key_locator[0], self._page_switching_key_locator[1] % (1))
                    Wait(self.marionette).until(expected.element_displayed(*page_1_key_locator))
                else:
                    self._tap_page_switching_key(1)
                    page_2_key_locator = (self._page_switching_key_locator[0], self._page_switching_key_locator[1] % (2))
                    Wait(self.marionette).until(expected.element_displayed(*page_2_key_locator))

    @property
    def _is_upper_case(self):
        return self.marionette.execute_script('return window.wrappedJSObject.app.upperCaseStateManager.isUpperCase;')

    @property
    def _is_upper_case_locked(self):
        return self.marionette.execute_script('return window.wrappedJSObject.app.upperCaseStateManager.isUpperCaseLocked;')

    @property
    def _current_input_type(self):
        return self.marionette.execute_script('return window.wrappedJSObject.app.getBasicInputType();')

    @property
    def _layout_page(self):
        return self.marionette.execute_script('return window.wrappedJSObject.app.layoutManager.currentPageIndex;')

    @property
    def _current_input_mode(self):
        return self.marionette.execute_script('return window.wrappedJSObject.app.inputContext.inputMode;')

    # this is to switch to the frame of keyboard
    def switch_to_keyboard(self, focus=False):
        self.marionette.switch_to_frame()
        input_window = self.marionette.find_element(*self._input_window_locator)

        # if we have software buttons, keyboar's y will not be 0 but the minus height of the button container.
        expected_y = -System(self.marionette).software_buttons_height

        Wait(self.marionette).until(
            lambda m: 'active' in input_window.get_attribute('class') and input_window.location['y'] == expected_y,
            message='Keyboard inputWindow not interpreted as displayed. Debug is_displayed(): %s, class: %s.'
            % (input_window.is_displayed(), input_window.get_attribute('class')))

        keybframe = self.marionette.find_element(*self._keyboard_active_frame_locator)
        return self.marionette.switch_to_frame(keybframe, focus)

    @property
    def current_keyboard(self):
        self.marionette.switch_to_frame()
        keyboard = self.marionette.find_element(*self._keyboard_active_frame_locator).get_attribute('data-frame-name')
        return keyboard

    # this is to get the locator of desired key on keyboard
    def _key_locator(self, val):
        if len(val) == 1:
            val = ord(val)
        return (self._button_locator[0], self._button_locator[1] % (val, val))

    # this is to tap on desired key on keyboard
    def _tap(self, val):
        key = Wait(self.marionette).until(expected.element_present(*self._key_locator(val)))
        Wait(self.marionette).until(expected.element_displayed(key))
        Actions(self.marionette).press(key).release().perform()

        # These two tap cases are most important because they cause the keyboard to change state which affects next step
        if val.isspace():
            # Space switches back to Default layout
            Wait(self.marionette).until(lambda m: self._layout_page == 0)
        if val.isupper() and not self._is_upper_case_locked:
            # Tapping key with shift enabled causes the keyboard to switch back to lower
            Wait(self.marionette).until(lambda m: not self._is_upper_case)

    def _tap_page_switching_key(self, val):
        locator = (self._page_switching_key_locator[0], self._page_switching_key_locator[1] % val)
        key = Wait(self.marionette).until(expected.element_present(*locator))
        Wait(self.marionette).until(expected.element_displayed(key))
        Actions(self.marionette).press(key).release().perform()

    # This is for selecting special characters after long pressing
    # "selection" is the nth special element you want to select (n>=1)
    def choose_extended_character(self, long_press_key, selection, movement=True):
        self.switch_to_keyboard()
        action = Actions(self.marionette)

        # after switching to correct keyboard, set long press if the key is there
        self._switch_to_correct_layout(long_press_key)
        key = Wait(self.marionette).until(expected.element_present(*self._key_locator(long_press_key)))
        Wait(self.marionette).until(expected.element_displayed(key))
        action.press(key).wait(1).perform()

        # find the extended key and perform the action chain
        extend_keys = self.marionette.find_elements(*self._highlight_key_locator)
        if movement is True:
            action.move(extend_keys[selection - 1]).perform()
        action.release().perform()

        self.apps.switch_to_displayed_app()

    def enable_caps_lock(self):
        self.switch_to_keyboard()
        key_obj = self.marionette.find_element(*self._key_locator(self._upper_case_key))
        self.marionette.double_tap(key_obj)
        self.apps.switch_to_displayed_app()

    # this would go through fastest way to tap/click through a string
    def send(self, string):
        self.switch_to_keyboard()
        for val in string:
            if ord(val) > 127:
                # this would get the right key to long press and switch to the right keyboard
                middle_key_val = self._find_key_for_longpress(val.encode('UTF-8'))
                self._switch_to_correct_layout(middle_key_val)

                # find the key to long press and press it to get the extended characters list
                middle_key = self.marionette.find_element(*self._key_locator(middle_key_val))
                action = Actions(self.marionette)
                action.press(middle_key).wait(1).perform()

                # find the targeted extended key to send
                key = Wait(self.marionette).until(
                    expected.element_present(*self._key_locator(val)))
                Wait(self.marionette).until(expected.element_displayed(key))
                action.move(key).release().perform()
            else:
                # after switching to correct keyboard, tap/click if the key is there
                self._switch_to_correct_layout(val)
                self._tap(val)

                # when we tap on '@' the layout switches to the default keyboard - Bug 996332
                if val == '@':
                    Wait(self.marionette).until(
                        lambda m: self._layout_page == 0)

        self.apps.switch_to_displayed_app()

    # Switch keyboard language
    # Mapping of language code => {
    # "ar":"ﺎﻠﻋﺮﺒﻳﺓ",
    # "cz":"Česká",
    # "de":"Deutsch",
    # "el":"Greek"
    # "en":"English",
    # "en-Dvorak":"Dvorak",
    # "es":"Español",
    # "fr":"français",
    # "he":"עִבְרִית",
    # "nb":"Norsk",
    # "pt_BR":"Português",
    # "pl":"polski",
    # "ru":"русский",
    # "sk":"Slovenčina",
    # "sr-Cyrl":"српска ћирилица",
    # "sr-Latn":"srpski",
    # "tr":"Türkçe"}
    def switch_keyboard_language(self, lang_code):
        # TODO At the moment this doesn't work because the UI has changed
        # An attempted repair ran into https://bugzilla.mozilla.org/show_bug.cgi?id=779284 (Modal dialog)

        keyboard_language_locator = (By.CSS_SELECTOR, ".keyboard-row button[data-keyboard='%s']" % lang_code)

        self.switch_to_keyboard()
        language_key = self.marionette.find_element(*self._language_key_locator)
        action = Actions(self.marionette)
        action.press(language_key).wait(1).perform()
        target_kb_layout = self.marionette.find_element(*keyboard_language_locator)
        action.move(target_kb_layout).release().perform()
        self.apps.switch_to_displayed_app()

    def tap_keyboard_language_key(self):
        self.switch_to_keyboard()
        key = Wait(self.marionette).until(
            expected.element_present(*self._language_key_locator))
        Wait(self.marionette).until(expected.element_displayed(key))
        key.tap()
        self.apps.switch_to_displayed_app()

    # following are "5 functions" to substitute finish switch_to_frame()s and tap() for you
    def tap_shift(self):
        self.switch_to_keyboard()
        self._tap(self._upper_case_key)
        self.apps.switch_to_displayed_app()

    def tap_backspace(self):
        self.switch_to_keyboard()
        backspace = self.marionette.find_element(self._button_locator[0], self._button_locator[1] % (self._backspace_key, self._backspace_key))
        backspace.tap()
        self.apps.switch_to_displayed_app()

    def tap_space(self):
        self.switch_to_keyboard()
        self._tap(self._space_key)
        self.apps.switch_to_displayed_app()

    def tap_enter(self):
        self.switch_to_keyboard()
        self._tap(self._enter_key)
        self.apps.switch_to_displayed_app()

    def tap_dotcom(self):
        self.switch_to_keyboard()
        dotcom = self.marionette.find_element(*self._dotcom_key_locator)
        dotcom.tap()
        self.apps.switch_to_displayed_app()

    def dismiss(self):
        # Make sure that keyboard is focused, otherwise dismissing it doesn't work
        self.switch_to_keyboard(focus=True)
        self.marionette.switch_to_frame()
        # navigator.mozKeyboard is needed for v1.3 support
        self.marionette.execute_script("""
var keyboard = navigator.mozKeyboard || navigator.mozInputMethod;
keyboard.removeFocus();""")
        input_window = self.marionette.find_element(*self._input_window_locator)

        # if we have software buttons, keyboar's y will not be 0 but the minus height of the button container.
        expected_y = int(input_window.size['height']) - System(self.marionette).software_buttons_height

        Wait(self.marionette).until(
            lambda m: 'active' not in input_window.get_attribute('class') and
            not input_window.is_displayed() and
            (int(input_window.location['y']) == expected_y),
            message="Keyboard was not dismissed. Debug is_displayed(): %s, class: %s."
                    %(input_window.is_displayed(), input_window.get_attribute('class')))
        self.apps.switch_to_displayed_app()

    def tap_first_predictive_word(self):
        self.switch_to_keyboard()
        key = Wait(self.marionette).until(
            expected.element_present(*self._predicted_word_locator))
        Wait(self.marionette).until(expected.element_displayed(key))
        key.tap()
        self.apps.switch_to_displayed_app()

    def tap_suggestion(self, word):
        self.switch_to_keyboard()

        # find the requested suggestion
        selector = (By.CSS_SELECTOR, '.suggestions-container span[data-data=\"%s\"]' % word)
        key = Wait(self.marionette).until(expected.element_present(*selector))
        Wait(self.marionette).until(expected.element_displayed(key))
        key.tap()
        self.apps.switch_to_displayed_app()

    # Accessibility related properties and methods

    def _a11y_get_role(self, locator_args):
        element = Wait(self.marionette).until(
            expected.element_present(*locator_args))
        Wait(self.marionette).until(expected.element_displayed(element))
        return self.accessibility.get_role(element)

    def _a11y_get_name(self, locator_args):
        element = Wait(self.marionette).until(
            expected.element_present(*locator_args))
        Wait(self.marionette).until(expected.element_displayed(element))
        return self.accessibility.get_name(element)

    @property
    def a11y_first_predictive_word_name(self):
        return self._a11y_get_name(self._predicted_word_locator)

    @property
    def a11y_first_predictive_word_role(self):
        return self._a11y_get_role(self._predicted_word_locator)

    @property
    def a11y_candidate_panel_name(self):
        return self._a11y_get_name(self._candidate_panel_locator)

    @property
    def a11y_suggestions_container_role(self):
        return self._a11y_get_role(self._suggestions_container_locator)

    @property
    def a11y_dismiss_suggestions_button_role(self):
        return self._a11y_get_role(self._dismiss_suggestions_button_locator)

    @property
    def a11y_dismiss_suggestions_button_name(self):
        return self._a11y_get_name(self._dismiss_suggestions_button_locator)

    @property
    def a11y_enter_key_role(self):
        return self._a11y_get_role(self._key_locator(self._enter_key))

    @property
    def a11y_enter_key_name(self):
        return self._a11y_get_name(self._key_locator(self._enter_key))

    @property
    def a11y_space_key_role(self):
        return self._a11y_get_role(self._key_locator(self._space_key))

    @property
    def a11y_space_key_name(self):
        return self._a11y_get_name(self._key_locator(self._space_key))

    @property
    def a11y_backspace_key_name(self):
        return self._a11y_get_name([self._button_locator[0],
            self._button_locator[1] % (self._backspace_key, self._backspace_key)])

    @property
    def a11y_backspace_key_role(self):
        return self._a11y_get_role([self._button_locator[0],
            self._button_locator[1] % (self._backspace_key, self._backspace_key)])

    def a11y_first_predictive_word_click(self):
        self.switch_to_keyboard()
        element = Wait(self.marionette).until(
            expected.element_present(*self._predicted_word_locator))
        Wait(self.marionette).until(expected.element_displayed(element))
        self.accessibility.click(element)
        self.apps.switch_to_displayed_app()

    @property
    def is_keyboard_displayed(self):
        return 'active' in self.marionette.find_element(*self._input_window_locator).get_attribute('class')
