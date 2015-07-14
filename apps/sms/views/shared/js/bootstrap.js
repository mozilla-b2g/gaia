/* global Startup */

'use strict';

Startup.init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    console.log('Registration succeeded. Scope is %s', registration.scope);
  }).catch((e) => {
    console.error('Registration failed.', e);
  });
}
