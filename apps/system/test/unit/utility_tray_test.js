'use strict';

requireApp('system/js/utility_tray.js');


var LockScreen = { locked: false };

suite('system/UtilityTray', function() {

  var tinyTimeout = 25;

  var fakeUtilityTray;
  var fakeStatusbar;
  var fakeScreen;  

  var fakeEvt;

  setup(function(done) {

    fakeUtilityTray = document.createElement('div');
    fakeUtilityTray.id = 'utility-tray';
    document.body.appendChild(fakeUtilityTray);

    fakeStatusbar = document.createElement('div');
    fakeStatusbar.id = 'statusbar';
    document.body.appendChild(fakeStatusbar);

    fakeScreen = document.createElement('div');
    fakeScreen.id = 'screen';
    document.body.appendChild(fakeScreen);

    //UtilityTray don't bind DOM object in Init method.
    UtilityTray.overlay = document.getElementById('utility-tray');
    UtilityTray.statusbar = document.getElementById('statusbar');
    UtilityTray.screen = document.getElementById('screen');

    done();

  });

  teardown(function(done) {
    setTimeout(function() {
      var fatherNode = fakeUtilityTray.parentNode

      fatherNode.removeChild(fakeUtilityTray);
      fatherNode.removeChild(fakeStatusbar);
      fatherNode.removeChild(fakeScreen);

      done();
    }, tinyTimeout);
  });

  suite('show', function() {
    setup(function(done) {
      UtilityTray.init();
      UtilityTray.show();
      done();
    });

    test('should shown be true', function(done) {
      assert.equal( UtilityTray.shown, true);
      done();
    });

    test('should screen.classList add utility-tray', function(done) {
      assert.equal( UtilityTray.screen.classList.contains('utility-tray'), true);
      done();
    });

  });

  suite('hide', function() {
    setup(function(done) {
      UtilityTray.init();
      UtilityTray.hide();
      done();
    });

    test('should shown be false', function(done) {
      assert.equal( UtilityTray.shown, false);
      done();
    });

    test('should lastY and startY be undefined', function(done) {
      assert.equal( UtilityTray.lastY, undefined);
      assert.equal( UtilityTray.startY, undefined);
      done();
    });

    test('should screen.classList remove utility-tray', function(done) {
      assert.equal( UtilityTray.screen.classList.contains('utility-tray'), false);
      done();
    });

  });

  suite('onTouch', function() {
    setup(function(done) {

      UtilityTray.init();

      UtilityTray.onTouchStart({ pageY: 0 });
      //Move
      for(var distance = 0; distance < 100; distance++)
      	UtilityTray.onTouchStart({ pageY: distance });
      UtilityTray.onTouchEnd();

      done();
    });

    test('should be opening', function(done) {
      assert.equal( UtilityTray.opening, true);
      done();
    });

    test('should be show', function(done) {
      assert.equal( UtilityTray.shown, true);
      done();
    });

  });

  //handleEvent
  suite('handleEvent: emergencyalert', function() {
    setup(function(done) {
      fakeEvt = { type: 'emergencyalert'}
      UtilityTray.init();
      UtilityTray.show();
      UtilityTray.handleEvent( fakeEvt );
      done();
    });
    test('should be hide', function(done) {
      assert.equal( UtilityTray.shown, false);
      done();
    });
  });
  suite('handleEvent: touchstart', function() {
    setup(function(done) {
      fakeEvt = { 
      	type: 'touchstart', 
      	target: UtilityTray.overlay, 
      	touches: [0]
      };
      UtilityTray.handleEvent( fakeEvt );
      done();
    });
    test('should active be true', function(done) {
      assert.equal( UtilityTray.active, true);
      done();
    });
  });
  suite('handleEvent: touchend', function() {
    setup(function(done) {
      fakeEvt = { 
      	type: 'touchend', 
      	changedTouches: [0] 
      };
      UtilityTray.init();
      UtilityTray.active = true
      UtilityTray.handleEvent( fakeEvt );
      done();
    });
    test('should active be false', function(done) {
      assert.equal( UtilityTray.active, false);
      done();
    });
  });
  suite('handleEvent: transitionend', function() {
    setup(function(done) {
      fakeEvt = { type: 'transitionend' };
      UtilityTray.init();
      UtilityTray.hide();
      UtilityTray.handleEvent( fakeEvt );
      done();
    });
    test('should screen.classList remove utility-tray', function(done) {
      assert.equal( UtilityTray.screen.classList.contains('utility-tray'), false);
      done();
    });
  });

});