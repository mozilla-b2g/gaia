# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from gaiatest import GaiaTestCase


class TestWallpaper(GaiaTestCase):

    _display_locator = ('id', 'menuItem-display')
    _wallpaper_preview_locator = ('id', 'wallpaper-preview')
    _wallpaper_button_locator = ('css selector', "a[data-value='0']")
    _wallpaper_title_locator = ('css selector', "h1[data-l10n-id='select-wallpaper']")
    _pick_wallpapers_locator = ('css selector', "div[class='wallpaper']")
    _wallpaper_frame_locator = ('css selector', "iframe[src='app://wallpaper.gaiamobile.org/pick.html']")
    _settings_frame_locator = ('css selector', "iframe[src='app://settings.gaiamobile.org/index.html#root']")

    # default wallpaper
    _default_wallpaper_src = None

    def setUp(self):
        GaiaTestCase.setUp(self)

        # unlock the lockscreen if it's locked
        self.lockscreen.unlock()

    def test_change_wallpaper(self):
        # https://moztrap.mozilla.org/manage/case/3449/
        # launch the Settings app
        self.app = self.apps.launch('Settings')

        self.wait_for_element_displayed(*self._display_locator)
        display_item = self.marionette.find_element(*self._display_locator)
        self.marionette.tap(display_item)

        self.wait_for_element_displayed(*self._wallpaper_preview_locator)

        # save the default wallpaper's src
        wallpaper_preview = self.marionette.find_element(*self._wallpaper_preview_locator)
        self._default_wallpaper_src = wallpaper_preview.get_attribute('src')

        # Send the pick event to system
        self.marionette.tap(wallpaper_preview)

        # switch to the system app
        self.marionette.switch_to_frame()

        # choose the source as wallpaper app
        self.wait_for_element_displayed(*self._wallpaper_button_locator)
        self.marionette.tap(self.marionette.find_element(*self._wallpaper_button_locator))

        # switch to the wallpaper app
        self.wait_for_element_displayed(*self._wallpaper_frame_locator)
        self.marionette.switch_to_frame(self.marionette.find_element(*self._wallpaper_frame_locator))

        # pick a wallpaper
        self.wait_for_condition(lambda m: m.find_element(*self._wallpaper_title_locator).text != "")
        pick_wallpapers = self.marionette.find_elements(*self._pick_wallpapers_locator)
        self.wait_for_element_displayed(*self._pick_wallpapers_locator)
        self.marionette.tap(pick_wallpapers[3])

        # switch to the system app
        self.marionette.switch_to_frame()

        # switch to the setting app
        self.marionette.switch_to_frame(self.marionette.find_element(*self._settings_frame_locator))
        self.wait_for_element_displayed(*self._wallpaper_preview_locator)

        # save the new wallpaper's src
        new_wallpaper = self.marionette.find_element(*self._wallpaper_preview_locator).get_attribute('src')

        # verify the change of wallpaper
        self.assertFalse(new_wallpaper == self._default_wallpaper_src, 'Wallpaper has not changed from default.')

    def tearDown(self):
        # reset to the default wallpaper
        self.marionette.execute_script("navigator.mozSettings.createLock().set({'wallpaper.image' : arguments[0]});", [self._default_wallpaper_src])

        GaiaTestCase.tearDown(self)
