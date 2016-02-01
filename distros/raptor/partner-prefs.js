/*global user_pref*/
user_pref('b2g.adb.timeout', 0);
user_pref('dom.serviceWorkers.enabled', true);
// Remove this pref once bug 1125916 and bug 1125961 are fixed.
user_pref('network.disable.ipc.security', true);
