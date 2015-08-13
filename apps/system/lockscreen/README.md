# Gaia LockScreen Hacking Tips

Author(s): Greg Weng</br>Last Update: 2015/08/13

This is an brief instruction for people want to (or unfortunately have to) hack Gaia LockScreen.
It's a digest from another longer verions on the mailing list:

["About the current LockScreen architecture: what and why it is"](https://groups.google.com/forum/#!searchin/mozilla.dev.gaia/About$20/mozilla.dev.gaia/8yy1lrqzVfU/VaWkhnUPDgAJ)

Feel free to patch this (via bugs) or the full version on the mailing list (via replies).

## LockScreen Controllers

Current LockScreen related functions are in fact with multiple major controllers (in files):

`system/lockscreen/js`

* `lockscreen.js`
* `lockscreen_notifications.js`
* `lockscreen_inputpad.js`
* `lockscreen_state_manager.js`
* `lockscreen_media_playback.js`
* `lockscreen_charging.js`

`system/js`

* `secure_window_manager.js`
* `lock_screen_window_manager.js`

`shared/js`

* `lockscreen_connection_info_manager.js`
* `lockscreen_slide.js`

I don't list FindMyDevice since it's major code are in a standalone app.

These are major controllers of each function.
Besides that, there are also lots of helpers of the component, and they all rely on these controllers.
For example, the states named as `lockscreen_state_*` are all controlled by `lockscreen_state_manager.js`; and `lockscreen_notification_builder.js` is used by `lockscreen_notifications`.
I call these **controllers** is because they're the listeners of events and mozSetting changes.
Other files should be simple controllees, although in technical details this is not true.

## What are they for?

The `lockscreen.js` now still controls most of functions from unlocking to wallpaper.
However, in the recent patch ([Bug 1189641](https://bugzilla.mozilla.org/show_bug.cgi?id=1189641)), I prepare to turn it as a pure controllee, so the responsibility of deciding whether the screen should be unlocked will move to the `lockscreen_state_manager.js`.

The state manager now is mainly for UI changes, and for its own design defects and the following requirements after the implementation make us re-designed a new version of state machine.
But for now we could only first migrate to this mid-version state manager.
Anyway, after the bug, we can at least make sure there are only one controller of UI changes and unlocking.
And if there are any new requirements of controlling UI changes on the screen, they should be implemented in those `states` of the state manager.

Besides that, since the `lockscreen.js` has been as a monolithic and complicated controller so long, we shouldn't stockpile any new features on it.
If new release features ask us to add new **lockscreen** functions, please create new files under the lockscreen directory and implement them as standalone components.
Component still can call functions or read info from `lockscreen.js`, but its important to not put states or new functions on that.

The **keyboard** to input passcode of LockScreen is in fact a DIV element controlled by `lockscreen_inputpad.js`.
And `lock_screen_window_manager.js` control this **window** as we have a real keyboard frame as other apps.
This is a perquisite of enabling real keyboard app for LockScreen, which is also a feature request since long ago.
However, although we once evaluated whether it's not too difficult to implement that, we still need to overcome the issue of animation sync and how to implement the special UI of such keyboard.

Some files as `lockscreen_media_playback.js` and `lockscreen_charging.js` are **widgets** on the screen.
They sometimes require info from `lockscreen.js`, and things like `lockscreen_notification.js` even need to control it.
All of these communications are done by custom events.

The `secure_window_manager.js` controls **secure apps** like secure camera and emergency call.
They show up upon LockScreen.

At last, `lock_screen_window_manager.js` controls the `lock_screen_window.js`, which is an attempt to treat LockScreen as an ordinary app window.
It's also one part of our effort to make LockScreen as an app.
So now, only after `lock_screen_window_manager.js` call the window to create itself, the bootstrapping procedure of `lockscreen_bootstrap.js` will start itself.
These include those lazyloading files.

Also, people may remember it has been chaotic to look up if now device is locked in System app.
At 2.1+ versions, it is provided by `Service.locked`, which depends on whether the lockscreen window is opened.
