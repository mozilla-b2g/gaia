suite('views/hud', function() {
  'use strict';

  var view;

  suiteSetup(function(done) {
    var self = this;
    requirejs(['views/hud'], function(HudView) {
      self.HudView = HudView;
      done();
    });
  });

  setup(function() {
    view = new this.HudView();
  });

  test('HudView#setFlashMode()', function() {
    [{ title: 'flash-on', icon: 'flash-on' },
     { title: 'flash-off', icon: 'flash-off' },
     { title: 'flash-auto', icon: 'flash-auto' }].forEach(function(mode) {
      view.setFlashMode(mode);
      assert.equal(view.els.flash.dataset.icon, mode.icon);
      assert.equal(view.els.flash.getAttribute('data-l10n-id'),
        mode.title + '-button');
    });
  });

  test('HudView#setCamera()', function() {
    [{ title: 'toggle-camera-rear', icon: 'toggle-camera-rear' },
     { title: 'toggle-camera-front', icon: 'toggle-camera-front' }].forEach(
      function(mode) {
        view.setCamera(mode);
        assert.equal(view.els.camera.dataset.icon, mode.icon);
        assert.equal(view.els.camera.getAttribute('data-l10n-id'),
          mode.title + '-button');
      });
  });

  test('HudView#setMenuLabel()', function() {
    view.els.settings.removeAttribute('data-l10n-id');
    view.setMenuLabel();
    assert.equal(view.els.settings.getAttribute('data-l10n-id'), 'menu-button');
  });
});
