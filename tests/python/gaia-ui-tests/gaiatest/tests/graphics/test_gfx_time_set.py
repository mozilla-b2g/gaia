# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest.gaia_graphics_test import GaiaImageCompareTestCase
from gaiatest.apps.settings.app import Settings
from gaiatest.apps.system.regions.time_picker import TimePicker
from gaiatest.apps.system.regions.date_picker import DatePicker
from marionette.by import By
import pdb
class TestTimeChange(GaiaImageCompareTestCase):

    _dateandtime_menu_item_locator = (By.ID, 'menuItem-dateAndTime')
    _autotime_enabled_locator = (By.CSS_SELECTOR, '.time-auto')
    _autotime_enabled_switch_locator = (By.CSS_SELECTOR, '.time-auto label')
    _date_adjuster_locator = (By.CSS_SELECTOR, '.clock-date')
    _time_adjuster_locator = (By.CSS_SELECTOR, '.clock-time')
    settings = None

    def setUp(self):
        GaiaImageCompareTestCase.setUp(self)

    def test_gfx_time_set(self):

        self.open_settings()
        self.set_time('3','23','AM')

        self.set_date('March','29','2016')
        self.invoke_screen_capture(frame='chrome')
        self.close_settings()

    def open_settings(self):

        #launch settings app
        self.settings = Settings(self.marionette)
        self.settings.launch()
        self.settings._tap_menu_item(self._dateandtime_menu_item_locator)

        #disable 'Set Automatically'
        if self.is_autotime_enabled is True:
            self.marionette.find_element(*self._autotime_enabled_switch_locator).tap()
        self.wait_for_condition( lambda m: self.is_autotime_enabled is False)

    # take hh, mm, am/pm and set the time
    def set_time(self,hh,mm,am_pm):

        self.marionette.find_element(*self._time_adjuster_locator).tap()
        picker = TimePicker(self.marionette)

        if 1 <= int(hh) <= 12:
            if int(picker.hour) > int(hh):
                while int(picker.hour) != int(hh):
                    picker._flick_menu_down(picker._hour_picker_locator)
            elif int(picker.hour) < int(hh):
                while int(picker.hour) != int(hh):
                    picker._flick_menu_up(picker._hour_picker_locator)

        if 0 <= int(mm) <= 59:
            if int(picker.minute) > int(mm):
                while int(picker.minute) != int(mm):
                    picker._flick_menu_down(picker._minutes_picker_locator)
            elif int(picker.minute) < int(mm):
                while int(picker.minute) != int(mm):
                    picker._flick_menu_up(picker._minutes_picker_locator)

        if am_pm == 'AM' and picker.hour24 == 'PM':
                picker._flick_menu_down(picker._hour24_picker_locator)
        elif am_pm == 'PM' and picker.hour24 == 'AM':
                picker._flick_menu_up(picker._hour24_picker_locator)
        self.invoke_screen_capture(frame='chrome')

        picker.tap_done()


    # take month, date, year and set accordingly
    def set_date(self, month, date, year):

        month_list = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
                      'October', 'November', 'December']

        self.marionette.find_element(*self._date_adjuster_locator).tap()
        picker = DatePicker(self.marionette)
        #set month
        if month in month_list:
            if month_list.index(month) > month_list.index(picker.month):
                direction = 'up'
            else:
                direction = 'down'
            while month_list.index(month) != month_list.index(picker.month):
                picker.spin_month(direction)
        #set date
        if int(picker.date) > int(date):
            direction = 'down'
        else:
            direction = 'up'
        prev = 0
        while int(picker.date) != int(date) and prev != int(picker.date):
            prev = int(picker.date)
            picker.spin_date(direction)
        #set year
        if 2037 >= int(year) >= 1970:
            if int(picker.year) > int(year):
                direction = 'down'
            else:
                direction = 'up'
            while int(picker.year) != int (year):
                picker.spin_year(direction)
        self.invoke_screen_capture(frame='chrome')
        picker.tap_done()

    def close_settings(self):
         #exit settings
        self.apps.kill(self.settings.app)

    @property
    def is_autotime_enabled(self):
        if self.marionette.find_element(*self._autotime_enabled_locator).get_attribute('data-state') == \
                'auto':
            return True
        else:
            return False


    def tearDown(self):
        GaiaImageCompareTestCase.tearDown(self)