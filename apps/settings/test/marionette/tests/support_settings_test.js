var Settings = require('../app/app'),
    assert = require('assert');

// marionette('manipulate support settings', function() {
//   var client = marionette.client();
//   var settingsApp;
//
//   function gotoSupportPanel() {
//     settingsApp = new Settings(client);
//     settingsApp.launch();
//     // Navigate to the Support menu
//     supportPanel = settingsApp.supportPanel;
//   }
//
//   suite('check support without SIM custom', function() {
//
//     setup(function() {
//       gotoSupportPanel();
//     });
//
//     test('check support initial state', function() {
//       assert.ok(
//         !supportPanel.isOnlineSupportEnabled,
//         'online support is disabled by default'
//       );
//
//       assert.ok(
//         !supportPanel.isCallSupportEnabled,
//         'call support is disabled by default'
//       );
//     });
//
//   });
//
//   suite('check support with SIM custom', function() {
//     var onlineSupportTitleKey = 'support.onlinesupport.title';
//     var onlineSupportTitleValue = 'Online support';
//     var onlineSupportHrefKey = 'support.onlinesupport.href';
//     var onlineSupportHrefValue = 'http://www.mozilla.org/';
//
//     var callSupport1TitleKey = 'support.callsupport1.title';
//     var callSupport1TitleValue = 'Call support 1';
//     var callSupport1HrefKey = 'support.callsupport1.href';
//     var callSupport1HrefValue = 'tel:666';
//
//     var callSupport2TitleKey = 'support.callsupport2.title';
//     var callSupport2TitleValue = 'Call support 2';
//     var callSupport2HrefKey = 'support.callsupport2.href';
//     var callSupport2HrefValue = 'tel:999';
//
//     setup(function() {
//       client.settings.set(onlineSupportTitleKey, onlineSupportTitleValue);
//       client.settings.set(onlineSupportHrefKey, onlineSupportHrefValue);
//       client.settings.set(callSupport1TitleKey, callSupport1TitleValue);
//       client.settings.set(callSupport1HrefKey, callSupport1HrefValue);
//       client.settings.set(callSupport2TitleKey, callSupport2TitleValue);
//       client.settings.set(callSupport2HrefKey, callSupport2HrefValue);
//       gotoSupportPanel();
//     });
//
//     test('check custom support state', function() {
//       assert.ok(
//         supportPanel.isOnlineSupportEnabled,
//         'online support has been enabled'
//       );
//
//       assert.ok(
//         supportPanel.isCallSupportEnabled,
//         'call support has been enabled'
//       );
//     });
//
//     test('check custom online support', function() {
//       var onlineSupport = supportPanel.onlineSupport;
//       assert.equal(
//         onlineSupport.getAttribute('text'),
//         onlineSupportTitleValue,
//         'online support title is correct'
//       );
//       assert.equal(
//         onlineSupport.getAttribute('href'),
//         onlineSupportHrefValue,
//         'online support href is correct'
//       );
//     });
//
//     test('check custom call support', function() {
//       var callSupports = supportPanel.callSupports;
//
//       assert.equal(
//         callSupports.length, 2,
//         '2 call numbers should be displayed'
//       );
//
//       assert.ok(
//         callSupports[0].getAttribute('text').indexOf(
//           callSupport1TitleValue + ' (' +
//             callSupport1HrefValue + ')') !== -1,
//         'first call support title is correct'
//       );
//       assert.equal(
//         callSupports[0].getAttribute('href'),
//         callSupport1HrefValue,
//         'first call support number is valid'
//       );
//
//       assert.ok(
//         callSupports[1].getAttribute('text').indexOf(
//           callSupport2TitleValue + ' (' +
//             callSupport2HrefValue + ')') !== -1,
//         'second call support title is correct'
//       );
//       assert.equal(
//         callSupports[1].getAttribute('href'),
//         callSupport2HrefValue,
//         'second call support number is valid'
//       );
//     });
//
//   });
//
// });
