# -*- coding: UTF-8 -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from marionette.errors import NoSuchElementException
from marionette.errors import ElementNotVisibleException
from marionette.marionette import Actions

from gaiatest.apps.base import Base


class Keyboard(Base):
    '''
    There are two underlying strategies in this class;
    * send() method which uses logic to traverse the keyboard to type the string sent to it.
        Send should be used in tests where the layout of the keyboard is not tested and only string input is important
    * tap_x() or anything not send() methods which do not use logic to change keyboard panels.
        Tap should be used where the keyboard is expected to open with that key visible

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
    _language_key_locator = (By.CSS_SELECTOR, ".keyboard-row button[data-keycode='-3']")
    _dotcom_key_locator = (By.CSS_SELECTOR, ".keyboard-row button[data-compositekey='.com']")
    _numeric_sign_key = '-2'
    _alpha_key = '-1'
    _backspace_key = '8'
    _enter_key = '13'
    _alt_key = '18'
    _upper_case_key = '20'
    _space_key = '32'

    # keyboard app locators
    _keyboard_frame_locator = (By.CSS_SELECTOR, '#keyboards iframe')
    _keyboard_locator = (By.CSS_SELECTOR, '#keyboard')
    _button_locator = (By.CSS_SELECTOR, 'button.keyboard-key[data-keycode="%s"]')
    _highlight_key_locator = (By.CSS_SELECTOR, 'div.highlighted button')
    _predicted_word_locator = (By.CSS_SELECTOR, '.autocorrect')

    # find the key to long press and return
    def _find_key_for_longpress(self, input_value):
        for key_to_press, extended_values in self.lookup_table.iteritems():
            if input_value in extended_values:
                return key_to_press

    # trying to switch to right layout
    def _switch_to_correct_layout(self, val):
        input_type = self.marionette.execute_script('return window.wrappedJSObject.currentInputType;')
        layout_page = self.marionette.execute_script('return window.wrappedJSObject.layoutPage;')
        if val.isalpha():
            is_upper_case = self.marionette.execute_script('return window.wrappedJSObject.isUpperCase;')
            if not layout_page == 'Default':
                self._tap(self._alpha_key)
            if not val.isupper() == is_upper_case:
                self._tap(self._upper_case_key)
        # numbers and symbols are in another keyboard
        else:
            if not input_type == 'number' and layout_page == 'Default':
                self._tap(self._numeric_sign_key)
                self.wait_for_condition(lambda m: m.find_element(*self._key_locator(self._alpha_key)).is_displayed())
            if not self.is_element_present(*self._key_locator(val)):
                self._tap(self._alt_key)

    # this is to switch to the frame of keyboard
    def switch_to_keyboard(self):
        self.wait_for_condition(lambda m: self.is_displayed())
        self.marionette.switch_to_frame()
        keybframe = self.marionette.find_element(*self._keyboard_frame_locator)
        self.marionette.switch_to_frame(keybframe, focus=False)

    @property
    def current_keyboard(self):
        self.marionette.switch_to_frame()
        keyboard = self.marionette.find_element(*self._keyboard_frame_locator).get_attribute('data-frame-name')
        return keyboard

    # this is to get the locator of desired key on keyboard
    def _key_locator(self, val):
        if len(val) == 1:
            val = ord(val)
        return (self._button_locator[0], self._button_locator[1] % val)

    # this is to tap on desired key on keyboard
    def _tap(self, val):
        try:
            self.wait_for_condition(lambda m: m.find_element(*self._key_locator(val)).is_displayed())
            key = self.marionette.find_element(*self._key_locator(val))
            Actions(self.marionette).press(key).wait(0.1).release().perform()
        except (NoSuchElementException, ElementNotVisibleException):
            self.marionette.log('Key %s not found on the keyboard' % val)
            raise

    # This is for selecting special characters after long pressing
    # "selection" is the nth special element you want to select (n>=1)
    def choose_extended_character(self, long_press_key, selection, movement=True):
        self.switch_to_keyboard()
        action = Actions(self.marionette)

        # after switching to correct keyboard, set long press if the key is there
        self._switch_to_correct_layout(long_press_key)
        try:
            key = self.marionette.find_element(*self._key_locator(long_press_key))
            self.wait_for_condition(lambda m: key.is_displayed())
        except:
            raise Exception('Key %s not found on the keyboard' % long_press_key)
        action.press(key).wait(1).perform()

        # find the extended key and perform the action chain
        extend_keys = self.marionette.find_elements(*self._highlight_key_locator)
        if movement is True:
            action.move(extend_keys[selection - 1]).perform()
        action.release().perform()

        self.apps.switch_to_displayed_app()

    def enable_caps_lock(self):
        self.switch_to_keyboard()
        if self.is_element_present(*self._key_locator(self._alpha_key)):
            self._tap(self._alpha_key)
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
                target_key = self.marionette.find_element(*self._key_locator(val))
                action.move(target_key).release().perform()
            else:
                # after switching to correct keyboard, tap/click if the key is there
                self._switch_to_correct_layout(val)
                self._tap(val)

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
        self.marionette.find_element(*self._language_key_locator).tap()
        self.apps.switch_to_displayed_app()

    # switch to keyboard with numbers and special characters
    def switch_to_number_keyboard(self):
        self.switch_to_keyboard()
        self._tap(self._numeric_sign_key)
        self.apps.switch_to_displayed_app()

    # switch to keyboard with alphabetic keys
    def switch_to_alpha_keyboard(self):
        self.switch_to_keyboard()
        self._tap(self._alpha_key)
        self.apps.switch_to_displayed_app()

    # following are "5 functions" to substitute finish switch_to_frame()s and tap() for you
    def tap_shift(self):
        self.switch_to_keyboard()
        if self.is_element_present(*self._key_locator(self._alpha_key)):
            self._tap(self._alpha_key)
        self._tap(self._upper_case_key)
        self.apps.switch_to_displayed_app()

    def tap_backspace(self):
        self.switch_to_keyboard()
        backspace = self.marionette.find_element(self._button_locator[0], self._button_locator[1] % self._backspace_key)
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

    def tap_alt(self):
        self.switch_to_keyboard()
        if self.is_element_present(*self._key_locator(self._numeric_sign_key)):
            self._tap(self._numeric_sign_key)
        self._tap(self._alt_key)
        self.apps.switch_to_displayed_app()

    def tap_dotcom(self):
        self.switch_to_keyboard()
        dotcom = self.marionette.find_element(*self._dotcom_key_locator)
        dotcom.tap()
        self.apps.switch_to_displayed_app()

    def dismiss(self):
        self.wait_for_condition(lambda m: self.is_displayed())
        self.marionette.switch_to_frame()
        self.marionette.execute_script('navigator.mozKeyboard.removeFocus();')
        self.wait_for_condition(lambda m: not self.is_displayed())
        self.apps.switch_to_displayed_app()

    def is_displayed(self):
        self.marionette.switch_to_frame()
        keyboard = self.marionette.find_element(*self._keyboard_frame_locator)
        is_visible = keyboard.is_displayed() and keyboard.location['y'] == 0
        self.apps.switch_to_displayed_app()
        return is_visible

    def tap_first_predictive_word(self):
        self.switch_to_keyboard()
        self.wait_for_element_displayed(*self._predicted_word_locator)
        self.marionette.find_element(*self._predicted_word_locator).tap()
        self.apps.switch_to_displayed_app()
