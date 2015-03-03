## Email startup flow

The general goal for email startup is to render some UI as fast as possible to the user on startup. This UI may not be fully functional, but it should be HTML, so that if there are things like scrolling regions or text areas, the user can start to tap on them while the logic to handle the UI finishes loading.

This is accomplished by using a cache of the most frequently used startup cards. These caches are updated on each instantiation of the cards that participate in caching.

The cache is stored in localStorage so it can be synchronously retrieved and inserted into the DOM before the document finishes its first parse and render pass.

This approach should avoid unnecessary browser paints and needing to wait for a few async steps before knowing what UI to show, once the cache has been set up.

It also avoids loading up the email backend up front unless it is needed to determine startup state, like if there is an account configured but there is no localStorage cache of that information. The `model` module is the façade to the back end. If `model.init()` is called, then that will trigger the loading of the back end and its worker code.

## html_cache_restore

`html_cache_restore` is the first script the mail app runs. This script is like the primordial version of what the email service worker would eventually morph into. It does the following:

1) Figure out what start card should be shown. This could mean waiting for an async mozHasPendingMessage message to be triggered.

The goal is to have html_cache_restore not load any other JS until any async events and state are collected for startup, then kick off main loading. This allows the rest of the modules to be more straight-forward and easier to follow in their startup logic.

Accurately determining the startup card means knowing if there is an account configured. `html_cache_restore` will use a localStorage entry set up by `model` to get this information. If that localStorage entry is not there, then `html_cache_restore` will ask `config` to load model first, call it back, then make the final card determination. That localStorage value is not stamped with the signature of the app files, since it should not change during app updates.

2) Ask localStorage for an HTML cache for the entry point, and if it exists, insert it into the page.

The localStorage values are stamped with the signature of the app files, since changes in the app's zip contents likely means the UI changed. If the signature does not match the current signature stored in `html_cache_restore` (which is written by the build process), the cache is not used.

3) Triggers the loading of module loader, which also then loads the main app module, `config`.

4) It continues to listen for mozSetMessageHandler entry point messages, and dispatches to handlers that have registered to `window.globalOnAppMessage`. `mail_app` calls `globalOnAppMessage`. The startupData is returned from calls to `globalOnAppMessage`, so this is how `mail_app` knows what startup entry point and view are suggested by `html_cache_restore`.

`html_cache_restore` will **not** listen for mozSetMessageHandler messagesfor request-sync messages, because wake locks need to be acquired in that case, and given the complexity of that need, it relies on cronsync-main to do that work. `html_cache_restore` does detect if it was started from a request-sync message, but only uses that it setting up the startup state.

## config

This script sets up the module loader config, and if `html_cache_restore` needed the model loaded to determine if there is an account, config does that work.

If `html_cache_restore` does not need the model, it starts up `mail_app`.

## mail_app

`mail_app` is responsible for the following:

1) Register events that reset the top level state of the app, like when accounts are added or removed. `mail_app` is a top level router in this respect.

2) Use the startupData from `globalOnAppMessage` to determine what card to ask `cards` to load, and grab the DOM created by any cached HTML inserted by `html_cache_restore` to give to `cards` for that initial starting card instance.

3) Contain the main handlers for the mozSetMessageHandler messages that `html_cache_restore`'s `globalOnAppMessage` mechanism dispatches, as these messages trigger priority card insertions into the UI, over whatever else might be running.

## App states

The three states the cache can be in:

1) No cache (can be manually cleared by using the secret debug menu's "Reset startup cache"). In this state, it is unknown if the there is an account. Because of the upgrade issue where the old cookie cache was used, the user could have an account in the IndexedDB, but just not known by the startup cache.

2) Cache that knows if there is an account, but HTML cache is out of date with the signature of the email files. This happpens after a new code push/app update.

3) Cache knows there is an account, and cache is up to date. This is hopefully the usual day-to-day operational state of the email app.

The tests that can be run are based on the entry points into the app:

* Normal icon launch: hasAccount ? message_list : setup_account_info
* Activity launch: hasAccount ? message_list : compose
* Notification launch:
  * 1 message -> message_reader
  * More than one message -> message_list
  * No account (maybe deleted after notification sent, needs to be second account not shown on app startup since email app closes notifications when account's message_list is viewed): setup_account_info, or the message_list of the other account if no other accounts configured.
* Periodic sync. If app opened in the background -> no UI, until app is brought to foreground, then the appropriate UI given the entry point.
