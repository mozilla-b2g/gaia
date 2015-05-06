'use strict';

suite('BluetoothClassOfDeviceMapper > ', function() {
  setup(function(done) {
    var module = [
      'modules/bluetooth/bluetooth_cod_mapper'
    ];
    var map = {};
    var requireCtx = testRequire([], map, function() {});
    requireCtx(module, function(BtClassOfDeviceMapper) {
      this.BtClassOfDeviceMapper = BtClassOfDeviceMapper;
      done();
    }.bind(this));
  });

  suite('getDeviceType > major device class: computer, phone, audio/video, ' +
        'peripheral, imaging > ', function() {
    var mockCodInput, expectedType;
    suite('mapping in minor device class which is defined ', function() {
      setup(function() {
        mockCodInput = {
          majorDeviceClass: 4,
          majorServiceClass: 555,
          minorDeviceClass: 3
        };
        expectedType = 'audio-card';
      });

      test('should return device type = "audio-card" ', function() {
        assert.equal(this.BtClassOfDeviceMapper.getDeviceType(mockCodInput),
                     expectedType);
      });
    });

    suite('mapping in minor device class which is reserved ', function() {
      setup(function() {
        mockCodInput = {
          majorDeviceClass: 4,
          majorServiceClass: 555,
          minorDeviceClass: 23
        };
        expectedType = 'audio-card';
      });

      test('should return device type = "audio-card" ', function() {
        assert.equal(this.BtClassOfDeviceMapper.getDeviceType(mockCodInput),
                     expectedType);
      });
    });

    suite('mapping in minor device class which is not defined ', function() {
      setup(function() {
        mockCodInput = {
          majorDeviceClass: 6,
          majorServiceClass: 555,
          minorDeviceClass: 2
        };
        expectedType = '';
      });

      test('should return device type = "" ', function() {
        assert.equal(this.BtClassOfDeviceMapper.getDeviceType(mockCodInput),
                     expectedType);
      });
    });
  });

  suite('getDeviceType > major device class: network-wireless ', function() {
    var mockCodInput, expectedType;
    suite('mapping in major device class ', function() {
      setup(function() {
        mockCodInput = {
          majorDeviceClass: 3,
          majorServiceClass: 555,
          minorDeviceClass: 10
        };
        expectedType = 'network-wireless';
      });

      test('should return device type = "network-wireless" ', function() {
        assert.equal(this.BtClassOfDeviceMapper.getDeviceType(mockCodInput),
                     expectedType);
      });
    });
  });

  suite('getDeviceType > not mapping in any class ', function() {
    var mockCodInput, expectedType;
    suite('not mapping in any class ', function() {
      setup(function() {
        mockCodInput = {
          majorDeviceClass: 8,
          majorServiceClass: 555,
          minorDeviceClass: 10
        };
        expectedType = '';
      });

      test('should return device type = "" ', function() {
        assert.equal(this.BtClassOfDeviceMapper.getDeviceType(mockCodInput),
                     expectedType);
      });
    });
  });
});
