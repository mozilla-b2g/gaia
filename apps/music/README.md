# Music

The Music app is one of the Gaia's core media apps. It's capable of:

- Displays the user's collection by **mix**.
- Displays the user's collection by **playlist**.
- Displays the user's collection by **album**.
- Displays the user's collection by **artist**.
- Displays the user's collection by **title**.
- Allows the user to **play** the songs.
- Allows the user to **share** the songs as ringtones.
- Allows the user to **view** the downloaded audio files.
- Allows the user to **search** the songs.

It scans the internal/external storages on the device. Copying your songs into the internal storage or sd card could both be found then displayed in the Music app. It recognized the [Extensions](https://dxr.mozilla.org/mozilla-central/source/toolkit/content/devicestorage.properties) that the [DeviceStorage](https://developer.mozilla.org/en-US/docs/Web/API/Device_Storage_API) api knows about.

Testing Music app will need some contents so copying your audio files into:

- [Firefox OS Simulator](https://developer.mozilla.org/en-US/docs/Tools/Firefox_OS_Simulator) or [Firefox Mulet](https://wiki.mozilla.org/Mulet): see the [SD card emulation](https://developer.mozilla.org/en/docs/Tools/Firefox_OS_Simulator#SD_card_emulation) for details.
- [Developer phones](https://developer.mozilla.org/en-US/Firefox_OS/Phone_guide): Settings app > Enable the USB Storage > the storages will be mounted to your computer.

## App

[App](js/music.js) object is the first thing you should know about this app. It's the entry of Music and setups the basis, like:

- **Start Mode**: Music app has there start modes, there are:
  - *Regular*: every time we launch the Music app from the homescreen icons, it's the regular start mode.
  - *Pick*: the other apps, such as SMS or Email needs the Music app to provide the audio attachments, Music app will be launched as open [Activity](https://developer.mozilla.org/en-US/docs/Web/API/Web_Activities).
  - *Open*: this start mode is actually *NOT* setup by the App object, it's handled by separated files, which are [open.html](open.html) and [open.js](js/open.js).

- **Database**: the basic database initialization.
- **UI**: the basic ui initialization, like the [Title](js/ui/title_bar.js) and [Tab](js/ui/tab_bar.js).
- **Overlay/Spinner**: the overlay/spinner is used to tell the user what's the state of Music app, like upgrading the database, no songs in the storages or the storages are mounted.
- **Communications**: the remote controls are also setup in the App object, to handle the remote commands from AVRCP(Bluetooth) or IAC(playback widgets in lockscreen and utility tray).
- **Performance**: several benchmarks are setup and they are used to measure the performance by the tools - [Raptor](https://developer.mozilla.org/en-US/Firefox_OS/Automated_testing/Raptor).

## Front-end

### Mode Manager

[Mode Manager](js/ui/views/mode_manager.js) is responsible for managing the the views and ui, basically it does:

- Record the modes and views information for the other modules to query.
- Provide methods to load and initialize views.
- Manipulate the views with page animations.
- Update the ui, like the title bar or the tabs bars.
- NFC sharing enable/disable.

### Views

- [Tiles](js/ui/views/tiles_view.js): Display the mix album covers and handle the logic.
- [List](js/ui/views/list_view.js): Display the album/artist/song lists and handle the logic in list view. Note that because it's possible to load lots of items in list view, it uses batch-loading strategy to display the items. When it activates, it displays first 5 pages, after the user scrolled down it will display more items.
- [Sub-List](js/ui/views/subList_view.js): Display the songs and handle the logic.
- [Player](js/ui/views/player_view.js): Display the player ui and handle the playback logic.
- [Search](js/ui/views/search_view.js): Display the search ui and handle the search logic.

### Title

- [Title](js/ui/title_bar.js): Control the title bar and handle the logic.

### Tabs

- [Tab](js/ui/tab_bar.js): Control the tabs bar and handle the logic.

## Back-end

### Database

- [Database](js/db.js): To Be Added.

### Metadata

- [Parsers](js/metadata): To Be Added.

### Communications

- [Communications](js/communications.js): Music app imports [Remote Controls](https://github.com/mozilla-b2g/gaia/blob/master/shared/js/media/remote_controls.js) to listen the remote commands, from Bluetooth [AVRCP](https://en.wikipedia.org/wiki/List_of_Bluetooth_profiles#Audio.2FVideo_Remote_Control_Profile_.28AVRCP.29) and [IAC/Inter App Communication](https://wiki.mozilla.org/WebAPI/Inter_App_Communication). It handles the remote commands and interacts with the requested clients, such as bluetooth devices and the media playback widgets in Lock Screen and Utility Tray.

## Others

- [Utilities](js/utils.js): Helper functions.

## Testing

### Unit tests

To Be Added

### Integration tests

To Be Added
