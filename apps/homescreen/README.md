# homescreen

homescreen is the primary homescreen implementation for FirefoxOS 2.5, that leverages web components to help improve reusability and enforce code separation. Performance, UX and maintainability are its top priorities.

## Requirements

homescreen requires a version of FirefoxOS >= 2.5, and that web components are enabled. This can be done by enabling the device preference `dom.webcomponents.enabled`. See Bug 1181555 for tracking the progress of allowing non-certified apps to use web components.

## Installing and running

homescreen will be installed when building the install-gaia target, but can also be installed with the WebIDE in Firefox. Open this directory as a project in WebIDE, and choose 'Install and Run' from the project menu or toolbar.

homescreen can be made the default homescreen by entering the Settings app, choosing 'Homescreens' and switching to 'New Home Screen'.

## Usage

Apps are presented in a vertical, paged list which can be scrolled through by swiping. App column arrangement can be altered by using a two-finger pinch gesture.

Apps can be rearranged by long-pressing on an app icon, then without removing that finger, dragging it to where that icon should be. Dragging near the top or bottom edges of the screen will switch to the previous or next pages respectively.

Uninstalling an app can be achieved by long-pressing an app icon and dragging it over the uninstall tray that appears at the bottom of the screen. System apps cannot be uninstalled.

Bookmarks can be edited by long-pressing a bookmark icon and dragging it over the edit tray that appears at the bottom-right of the screen.
