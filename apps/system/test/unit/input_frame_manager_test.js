'use strict';

/* global MocksHelper, InputFrameManager, MockKeyboardManager */
/* MockInputWindow */

require('/test/unit/mock_keyboard_manager.js');
require('/test/unit/mock_input_window.js');
require('/js/input_frame_manager.js');

var mocksForInputFrameManager = new MocksHelper([
  'KeyboardManager', 'InputWindow'
]).init();

suite('InputFrameManager', function() {
  mocksForInputFrameManager.attachTestHelpers();

  var manager;

  setup(function(){
    manager = new InputFrameManager(MockKeyboardManager);
  });
});
