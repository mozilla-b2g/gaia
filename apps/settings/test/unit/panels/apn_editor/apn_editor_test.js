'use strict';

suite('ApnEditor', function() {
  var mockRootElement = {
    querySelector: function(name) {
      var obj = {
        className: name
      };
      return obj;
    }
  };

  var map = {
    '*': {
      'panels/apn_editor/apn_editor_session': 'MockApnEditorSession'
    }
  };
  var modules = [
    'panels/apn_editor/apn_editor',
    'panels/apn_editor/apn_editor_const',
    'MockApnEditorSession'
  ];

  suiteSetup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    this.mockApnEditorSession = {};
    define('MockApnEditorSession', function() {
      return sinon.stub().returns(this.mockApnEditorSession);
    }.bind(this));

    requireCtx(modules,
      function(ApnEditor, ApnEditorConst, MockApnEditorSession) {
        this.ApnEditor = ApnEditor;
        this.ApnEditorConst = ApnEditorConst;
        this.MockApnEditorSession = MockApnEditorSession;
        done();
    }.bind(this));
  });

  setup(function() {
    this.MockApnEditorSession.reset();
    this.apnEditor = this.ApnEditor(mockRootElement);
  });

  suite('_fillInputElements', function() {
    var mockInputElements = {};
    var mockApn = {};

    suiteSetup(function() {
      mockApn = {};
      this.ApnEditorConst.APN_PROPERTIES.forEach(function(name) {
        mockApn[name] = name + '_value';
      }, this);
    });

    setup(function() {
      mockInputElements = {};
      this.ApnEditorConst.APN_PROPERTIES.forEach(function(name) {
        mockInputElements[name] = {};
      }, this);

      this.sinon.stub(this.apnEditor, '_convertValue', function(value) {
        return value;
      });
    });

    test('values of the input elements should be filled correctly', function() {
      this.apnEditor._fillInputElements(mockInputElements, mockApn);
      this.ApnEditorConst.APN_PROPERTIES.forEach(function(name) {
        assert.equal(mockInputElements[name].value, mockApn[name]);
      }, this);
    });

    test('should fill default values when necessary', function() {
      this.apnEditor._fillInputElements(mockInputElements, {});
      this.ApnEditorConst.APN_PROPERTIES.forEach(function(name) {
        assert.equal(mockInputElements[name].value,
          this.ApnEditorConst.APN_PROPERTY_DEFAULTS[name]);
      }, this);
    });
  });

  suite('createApn', function() {
    var serviceId = 0;
    var mockApnItem = {
      apn: {}
    };

    setup(function() {
      this.sinon.stub(this.apnEditor, '_fillInputElements');
    });

    test('the result should equal to the one returned from ApnEditorSession',
      function() {
        var session = this.apnEditor.createApn(serviceId, mockApnItem);
        assert.equal(session, this.mockApnEditorSession);
    });

    test('should call to _fillInputElements', function() {
      this.apnEditor.createApn(serviceId, mockApnItem);
      sinon.assert.calledWith(this.apnEditor._fillInputElements,
        this.apnEditor._inputElements, mockApnItem.apn);
    });

    test('should call to MockApnEditorSession', function() {
      this.apnEditor.createApn(serviceId, mockApnItem);
      sinon.assert.calledWith(this.MockApnEditorSession, serviceId, 'new',
        this.apnEditor._inputElements, mockApnItem);
    });
  });

  suite('editApn', function() {
    var serviceId = 0;
    var mockApnItem = {
      apn: {}
    };

    setup(function() {
      this.sinon.stub(this.apnEditor, '_fillInputElements');
    });

    test('the result should equal to the one returned from ApnEditorSession',
      function() {
        var session = this.apnEditor.createApn(serviceId, mockApnItem);
        assert.equal(session, this.mockApnEditorSession);
    });

    test('should call to _fillInputElements', function() {
      this.apnEditor.createApn(serviceId, mockApnItem);
      sinon.assert.calledWith(this.apnEditor._fillInputElements,
        this.apnEditor._inputElements, mockApnItem.apn);
    });

    test('should call to MockApnEditorSession', function() {
      this.apnEditor.editApn(serviceId, mockApnItem);
      sinon.assert.calledWith(this.MockApnEditorSession, serviceId, 'edit',
        this.apnEditor._inputElements, mockApnItem);
    });
  });
});
