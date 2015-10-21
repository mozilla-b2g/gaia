# Apps (App Deck)

App deck is a smart screen app that provides functionality of

1. displaying all installed app.
2. uninstalling app
3. pinning app to `Home`

From JS point-of-view, App deck is composed of three classes:
* AppDeck
* ContextMenu
* PromotionList

AppDeck class is the main controller of this app. It handles all behavior and UI of app-deck. The other two classes work as submodule of AppDeck and are both initialized by AppDeck. AppDeck also utilize other classes or module that help it do things.

ContextMenu class handles things related to 'contextmenu' event. User could pin/unpin/remove apps via context menu. Thus the logic and UI of context menu are all in this classes. We use [IAC](http://mzl.la/1TKR6zw) to pin an app and [MozActivity](http://mzl.la/1Pu8ecc) to unpin an app.

PromotionList class handles UI and animation of upper half (section#jumbotron) of app deck. It is designed to display recommended apps on Marketplace. However we have no time to finish this part yet so currently we only make it looks and feels like it should be.

From HTML point-of-view, app deck is divided in two sections:
* promotion list (section#jumbotron)
* app lists (section#app-deck-grid-view-container)

We use [XScrollable](http://bit.ly/1DWHgsH) to display apps and response to user interaction in app lists. Every app in app lists is encapsulated in [SmartButton](http://bit.ly/1Ld0WYX).

## JSDOC

Generated jsdoc is hosted on [http://mozilla-b2g.github.io/gaia/app-deck/](http://mozilla-b2g.github.io/gaia/app-deck/). You can generate it locally with the following command:

```
$ gulp jsdoc:app-deck
```
