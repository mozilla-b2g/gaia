'use strict';

suite('Panel Localization', function() {
  var panelClasses;

  suiteSetup(function(done) {
    require(['panels/timer/main', 'panels/stopwatch/main',
             'panels/alarm/main', 'panels/alarm_edit/main'], function() {
      panelClasses = Array.slice(arguments);
      done();
    });
  });

  test('All panels are translated', function() {
    // This test is designed to provide a basic sanity check that all
    // main panels are localized. It stringifies the constructor
    // rather than instantiating a panel because it's simpler to
    // perform this simple check than to load all the DOM elements
    // needed by the different panels. Simple, easy, and it works.
    panelClasses.forEach(function(PanelClass) {
      assert.ok(/mozL10n.translate\(/.test(PanelClass.toString()),
                PanelClass.name + ' must be localized.');
    });
  });
});
