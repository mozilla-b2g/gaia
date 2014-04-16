# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base


class ModalDialog(Base):
    """
    ModalDialog holds the basic methods used for modals: getting the text and
    clicking on the ok button.

    The root element is used to differentiate between specific modals since all of them
    have elements in common.

    root_element = the form containing the modal
    """

    _ok_button_locator = (By.CSS_SELECTOR, 'button.confirm')
    _modal_text_locator = (By.CSS_SELECTOR, 'p span')

    def __init__(self, marionette, root_locator):
        Base.__init__(self, marionette)
        self.marionette.switch_to_frame()
        self.wait_for_element_displayed(*root_locator)
        self.root_element = self.marionette.find_element(*root_locator)

    def tap_ok_button(self):
        self.root_element.find_element(*self._ok_button_locator).tap()

    @property
    def modal_text(self):
        return self.root_element.find_element(*self._modal_text_locator).text

    @property
    def is_modal_displayed(self):
        self.marionette.switch_to_frame()
        return self.root_element.is_displayed()


class ModalAlert(ModalDialog):
    _alert_modal_locator = (By.CSS_SELECTOR, 'form.modal-dialog-alert')

    def __init__(self, marionette):
        ModalDialog.__init__(self, marionette, self._alert_modal_locator)
