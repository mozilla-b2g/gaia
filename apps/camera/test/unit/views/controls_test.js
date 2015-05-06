suite('views/controls', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'views/controls',
      'drag'
    ], function(ControlsView, Drag) {
      self.ControlsView = ControlsView;
      self.Drag = Drag;
      self.style = loadCss('/style/controls.css', function() { done(); });
    });
  });

  suiteTeardown(function() {
    this.style.remove();
  });

  function loadCss(url, done) {
    var link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = done;
    document.head.appendChild(link);
    return link;
  }

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
    this.sandbox.spy(this.ControlsView.prototype, 'onSwitchTapped');

    this.drag = sinon.createStubInstance(this.Drag);
    this.view = new this.ControlsView({ drag: this.drag });
    this.view.els.image = undefined;
    this.classes = this.view.el.classList;

    this.sandbox.stub(this.view.els.thumbnail);
    this.sandbox.spy(this.view, 'set');
    this.sandbox.spy(this.view, 'emit');
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

  suite('ControlsView#setScreenReaderVisible()', function() {
    test('hide the view from screen reader', function() {
      this.view.setScreenReaderVisible(false);
      assert.equal(this.view.el.getAttribute('aria-hidden'), 'true');
    });

    test('show the view to the screen reader', function() {
      this.view.el.setAttribute('aria-hidden', true);
      this.view.setScreenReaderVisible(true);
      assert.equal(this.view.el.getAttribute('aria-hidden'), 'false');
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

  suite('ControlsView#onSwitchTapped()', function() {
    setup(function() {
      this.event = {
        preventDefault: sinon.spy(),
        stopPropagation: sinon.spy()
      };
      this.spy = this.ControlsView.prototype.onSwitchTapped;
      this.view.enable();
    });

    test('It emits a `modechanged` event', function() {
      this.view.onSwitchTapped(this.event);
      sinon.assert.calledWith(this.view.emit, 'modechanged');
    });

    test('It prevents default to stop the event becoming a click', function() {
      this.view.onSwitchTapped(this.event);
      sinon.assert.called(this.event.preventDefault);
    });

    test('It is debounced to defend against button bashing', function() {
      this.view.setupSwitch();
      var callback = this.drag.on.withArgs('tapped').args[0][1];

      callback(this.event);
      callback(this.event);
      callback(this.event);
      callback(this.event);

      sinon.assert.calledOnce(this.spy);
    });
  });

  suite('ControlsView#onSwitchSnapped()', function() {
    setup(function() {
      this.view.set('mode', 'picture');
    });

    test('It fires \'modechanged\' when the switch changes position', function() {

      // Didn't change
      this.view.onSwitchSnapped({ x: 'left' });
      assert.isFalse(this.view.emit.calledWith('modechanged'));

      // Changed
      this.view.onSwitchSnapped({ x: 'right' });
      assert.isTrue(this.view.emit.calledWith('modechanged'));
    });
  });

  test('The switch should appear in the video position when set before the view is in the DOM', function() {
    var view = new this.ControlsView();
    view.setMode('video');
    view.appendTo(document.body);
    assert.equal(view.drag.handle.el.style.transform, 'translate(64px, 0px)');
    assert.equal(view.els.switch.getAttribute('data-l10n-id'),
      'video-mode-button');
  });

  test('ControlsView#localize', function() {
    var view = new this.ControlsView();
    view.localize();
    for (var el in view.elsL10n) {
      assert.equal(view.els[el].getAttribute('data-l10n-id'), view.elsL10n[el]);
    }
    assert.equal(view.els.switch.getAttribute('data-l10n-id'),
      'picture-mode-button');
  });

  test('ControlsView#setCaptureLabel', function() {
    var view = new this.ControlsView();
    [true, false].forEach(function(recording) {
      view.setCaptureLabel(recording);
      assert.equal(view.els.capture.getAttribute('data-l10n-id'),
        recording ? 'stop-capture-button' : 'capture-button');
    });
  });
});
