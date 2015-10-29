# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from abc import ABCMeta, abstractproperty
from marionette_driver import Wait, expected
from gaiatest.form_controls.form_control import Widget


class BinaryControl(Widget):
    # This represent elements like Switches and Checkboxes

    __metaclass__ = ABCMeta

    @abstractproperty
    def is_checked(self):
        pass

    @property
    def is_displayed(self):
        return self.root_element.is_displayed()

    def enable(self):
        self._toggle_and_verify_state(final_state=True)

    def disable(self):
        self._toggle_and_verify_state(final_state=False)

    def wait_to_be_ready(self):
        Wait(self.marionette).until(expected.element_displayed(self.root_element))
        Wait(self.marionette).until(expected.element_enabled(self.root_element))

    def _toggle_and_verify_state(self, final_state):
        self.wait_to_be_ready()
        Wait(self.marionette).until(lambda m: self.is_checked is not final_state)
        self._toggle()
        Wait(self.marionette).until(lambda m: self.is_checked is final_state)
        self.wait_to_be_ready()

    def _toggle(self):
        self.root_element.tap()


class GaiaBinaryControl(BinaryControl):
    @property
    def is_checked(self):
        # Change for a more standard method, once Bug 1113742 lands
        return self.marionette.execute_script('return arguments[0].wrappedJSObject.checked', [self.root_element])


class HtmlBinaryControl(BinaryControl):
    @property
    def is_checked(self):
        return self.root_element.is_selected()
