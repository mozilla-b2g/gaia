'use strict';

suite('OperatorItem', function() {
  var OperatorItem;

  var modules = [
    'panels/operator_settings/models/operator_item'
  ];

  setup(function(done) {
    testRequire(modules, (_OperatorItem) => {
      OperatorItem = _OperatorItem;
      done();
    });
  });

  suite('name', function() {
    test('when short name is available', function() {
      var mockNetwork = {
        state: 'available',
        shortName: 'shortName',
        longName: 'longName' 
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.name, mockNetwork.shortName);
    });

    test('when only long name is available', function() {
      var mockNetwork = {
        state: 'available',
        longName: 'longName' 
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.name, mockNetwork.longName);
    });
  });

  suite('network', function() {
    test('should be the network used for constructing', function() {
      var mockNetwork = {
        state: 'available',
        shortName: 'shortName',
        longName: 'longName' 
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.network, mockNetwork);
    });
  });

  suite('state and _type', function() {
    test('when network.state is current', function() {
      var mockNetwork = {
        state: 'current'
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.state, OperatorItem.STATE.CONNECTED);
      assert.equal(operatorItem._type, OperatorItem.TYPE.AVAILABLE);
    });

    test('when network.state is connected', function() {
      var mockNetwork = {
        state: 'connected'
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.state, OperatorItem.STATE.CONNECTED);
      assert.equal(operatorItem._type, OperatorItem.TYPE.AVAILABLE);
    });

    test('when network.state is available', function() {
      var mockNetwork = {
        state: 'available'
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.state, OperatorItem.STATE.IDLE);
      assert.equal(operatorItem._type, OperatorItem.TYPE.AVAILABLE);
    });

    test('when network.state is forbidden', function() {
      var mockNetwork = {
        state: 'forbidden'
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.state, OperatorItem.STATE.IDLE);
      assert.equal(operatorItem._type, OperatorItem.TYPE.FORBIDDEN);
    });

    test('when network.state is others', function() {
      var mockNetwork = {
        state: 'other_state'
      };

      var operatorItem = OperatorItem(mockNetwork);
      assert.equal(operatorItem.state, OperatorItem.STATE.IDLE);
      assert.equal(operatorItem._type, OperatorItem.TYPE.UNKNOWN);
    });
  });

  suite('info', function() {
    var mockNetwork;
    var operatorItem;

    setup(function() {
      mockNetwork = {
        state: 'other_state'
      };
      operatorItem = OperatorItem(mockNetwork);
    });

    test('when the state is OperatorItem.STATE.IDLE', function() {
      operatorItem._state = OperatorItem.STATE.IDLE;
      assert.equal(operatorItem.info, operatorItem._type,
        'info should be _type');
    });

    test('when the state is not OperatorItem.STATE.IDLE', function() {
      operatorItem._state = OperatorItem.STATE.CONNECTING;
      assert.equal(operatorItem.info, operatorItem._state,
        'info should be _state');

      operatorItem._state = OperatorItem.STATE.CONNECTED;
      assert.equal(operatorItem.info, operatorItem._state,
        'info should be _state');

      operatorItem._state = OperatorItem.STATE.FAILED;
      assert.equal(operatorItem.info, operatorItem._state,
        'info should be _state');
    });

    test('when the state is null', function() {
      operatorItem._state = null;
      assert.equal(operatorItem.info, OperatorItem.TYPE.UNKNOWN,
        'info should be OperatorItem.TYPE.UNKNOWN');
    });
  });
});
