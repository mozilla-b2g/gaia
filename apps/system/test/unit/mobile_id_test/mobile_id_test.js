
/* global Controller, UI*/

'use strict';

requireApp('system/mobile_id/js/controller.js');
requireApp('system/mobile_id/js/ui.js');
requireApp('system/mobile_id/js/mobile_id.js');

suite('MobileID ', function() {
  test(' init rest of modules when "onload"', function() {
    this.sinon.stub(Controller, 'init');
    this.sinon.stub(UI, 'init');
    assert.ok(true);
    // Dispatch event "onload"
    var eventToLaunch = new CustomEvent(
      'load',
      {}
    );
    window.dispatchEvent(eventToLaunch);
    // Initialize both modules
    assert.ok(Controller.init.calledOnce);
    assert.ok(UI.init.calledOnce);
    Controller.init.reset();
    UI.init.reset();
  });
});
