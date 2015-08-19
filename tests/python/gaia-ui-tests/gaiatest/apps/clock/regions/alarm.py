# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_driver import expected, By, Wait

from gaiatest.apps.base import PageRegion


class Alarm(PageRegion):
    _alarm_create_new_locator = (By.ID, 'alarm-new')
    _alarm_view_locator = (By.ID, 'alarm-tab')
    _edit_alarm_view_locator = (By.ID, 'edit-alarm')
    _all_alarm_items_locator = (By.CSS_SELECTOR, '#alarms li')
    _banner_countdown_notification_locator = (By.ID, 'banner-countdown')
    _visible_clock_locator = (By.CSS_SELECTOR, '#clock-view .visible')

    def __init__(self, marionette):
        PageRegion.__init__(self, marionette,self._alarm_view_locator)
        view = self.marionette.find_element(*self._alarm_view_locator)
        Wait(self.marionette).until(lambda m: view.location['x'] == 0 and view.is_displayed())
        Wait(self.marionette).until(expected.element_displayed(
            Wait(self.marionette).until(expected.element_present(
                *self._alarm_create_new_locator))))

    @property
    def alarm_items(self):
        return [self.AlarmItem(self.marionette, alarm_item) for alarm_item in
                self.marionette.find_elements(*self._all_alarm_items_locator)]

    def tap_new_alarm(self):
        new_alarm = Wait(self.marionette).until(
            expected.element_present(*self._alarm_create_new_locator))
        Wait(self.marionette).until(expected.element_displayed(new_alarm))
        new_alarm.tap()
        from gaiatest.apps.clock.regions.new_alarm import NewAlarm
        return NewAlarm(self.marionette)

    @property
    def banner_notification(self):
        banner = Wait(self.marionette).until(
            expected.element_present(*self._banner_countdown_notification_locator))
        Wait(self.marionette).until(expected.element_displayed(banner))
        return banner.text

    def dismiss_banner(self):
        banner = Wait(self.marionette).until(
            expected.element_present(*self._banner_countdown_notification_locator))
        Wait(self.marionette).until(expected.element_displayed(banner))
        # We can't tap to clear the banner as sometimes it taps the underlying alarm changing the UI
        Wait(self.marionette).until(expected.element_not_displayed(banner))

    class AlarmItem(PageRegion):

        _label_locator = (By.CSS_SELECTOR, '.label')
        _check_box_locator = (By.CSS_SELECTOR, '.input-enable')
        _enable_button_locator = (By.CSS_SELECTOR, '.alarmList.alarmEnable')
        _time_locator = (By.CSS_SELECTOR, '.time')

        def time(self):
            return self.root_element.find_element(*self._time_locator).text

        @property
        def label(self):
            return self.root_element.find_element(*self._label_locator).text

        @property
        def is_alarm_active(self):
            return self.root_element.find_element(*self._check_box_locator).is_selected()

        def tap_checkbox(self):
            self.root_element.find_element(*self._enable_button_locator).tap()

        def wait_for_checkbox_to_change_state(self, value):
            checkbox = self.marionette.find_element(*self._check_box_locator)
            Wait(self.marionette).until(lambda m: checkbox.is_selected() == value)

        def tap(self):
            self.root_element.tap()
            from gaiatest.apps.clock.regions.new_alarm import EditAlarm
            return EditAlarm(self.marionette)
