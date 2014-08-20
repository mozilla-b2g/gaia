suite('views/preview-gallery', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['views/controls'], function(ControlsView) {
      self.ControlsView = ControlsView;
      done();
    });
  });

  setup(function() {
    var self = this;

    this.sandbox = sinon.sandbox.create();

    this.image = {
      classList: {
        add: function() {}
      }
    };

    window.URL = window.URL || {};
    window.URL.createObjectURL = window.URL.createObjectURL || function() {};
    window.URL.revokeObjectURL = window.URL.revokeObjectURL || function() {};
    this.sandbox.stub(window.URL, 'createObjectURL').returns('<object-url>');
    this.sandbox.stub(window.URL, 'revokeObjectURL');

    this.sandbox.stub(window, 'Image', function() { return self.image; });

    this.view = new this.ControlsView();
    this.view.els.image = undefined;
    this.classes = this.view.el.classList;

    this.sandbox.stub(this.view.els.thumbnail);
    this.sandbox.spy(this.view, 'set');
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('ControlsView#setThumbnail()', function() {
    test('Should set the thumbnail image src to the object url', function() {
      this.view.els.image = this.image;
      this.view.setThumbnail('<blob>');
      assert.equal(this.view.els.image.src, '<object-url>');
    });

    test('Should revokeObjectURL if image is already set', function() {
      this.view.setThumbnail('<blob-1>');
      sinon.assert.notCalled(window.URL.revokeObjectURL);

      this.view.setThumbnail('<blob-2>');
      sinon.assert.calledWith(window.URL.revokeObjectURL, '<object-url>');
    });

    test('Should set thumbnail to `true`', function() {
      this.view.setThumbnail('<blob>');
      sinon.assert.calledWith(this.view.set, 'thumbnail', true);
    });

    test('Should create an Image and add it to the thmbnail container', function() {
      this.view.setThumbnail('<blob>');
      sinon.assert.called(window.Image);
      sinon.assert.called(this.view.els.thumbnail.appendChild, this.image);
    });
  });

  suite('ControlsView#set()', function() {
    test('Should add the class if only one argument is given', function() {
      this.view.set('key');
      assert.isTrue(this.classes.contains('key'));
    });

    test('Should add a key/value class if a truthy value is given', function() {
      this.view.set('key', 'val');
      assert.isTrue(this.classes.contains('key-val'));
    });

    test('Should remove the previous class when the value is changed', function() {
      this.view.set('key', 'val');
      assert.isTrue(this.classes.contains('key-val'));

      this.view.set('key', 'val2');
      assert.isFalse(this.classes.contains('key-val1'));
      assert.isTrue(this.classes.contains('key-val2'));
    });

    test('Should only accept string keys', function() {
      this.view.set(false);
      assert.isFalse(this.classes.contains('false'));
      this.view.set(0);
      assert.isFalse(this.classes.contains('0'));
    });

    test('Should remove the class for any falsy values', function() {
      this.view.set('key');
      assert.isTrue(this.classes.contains('key'));
      this.view.set('key', undefined);
      assert.isFalse(this.classes.contains('key'));

      this.view.set('key');
      assert.isTrue(this.classes.contains('key'));
      this.view.set('key', 0);
      assert.isFalse(this.classes.contains('key'));

      this.view.set('key');
      assert.isTrue(this.classes.contains('key'));
      this.view.set('key', null);
      assert.isFalse(this.classes.contains('key'));

      this.view.set('key');
      assert.isTrue(this.classes.contains('key'));
      this.view.set('key', '');
      assert.isFalse(this.classes.contains('key'));
    });
  });

  suite('ControlsView#enable()', function() {
    test('Should add an enabled class if no value is given', function() {
      this.view.enable();
      assert.isTrue(this.classes.contains('enabled'));
    });

    test('Should add a key-enabled class if key is given', function() {
      this.view.enable('key');
      assert.isTrue(this.classes.contains('key-enabled'));
    });

    test('Should remove \'disabled\' class', function() {
      this.classes.add('disabled');
      this.view.enable();
      assert.isFalse(this.classes.contains('disabled'));
    });
  });

  suite('ControlsView#disabled()', function() {
    test('Should add an \'disables\' class if no value is given', function() {
      this.view.disable();
      assert.isTrue(this.classes.contains('disabled'));
    });

    test('Should add a key-enabled class if key is given', function() {
      this.view.disable('key');
      assert.isTrue(this.classes.contains('key-disabled'));
    });

    test('Should remove \'enabled\' class', function() {
      this.classes.add('enabled');
      this.view.disable();
      assert.isFalse(this.classes.contains('enabled'));
    });
  });
});
