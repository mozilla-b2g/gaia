/* global utils */

'use strict';

require('/shared/js/contacts/import/utilities/config.js');

suite('> Config Utilities', function() {
  var subject, xhr;

  var configObj = {
    'id': 12,
    'comment': 'Hey there'
  };

  var existingResource = 'file1.json', nonExistingResource = 'filen.json';

  function requestHandler(request, url) {
    switch(url) {
      case 'file1.json':
        setTimeout(function() {
          request.response = configObj;
          request.onload();
        });
      break;

      case 'filen.json':
        setTimeout(function() {
          request.error = 'FileNotExists';
          request.onerror();
        });
      break;
    }
  }

  suiteSetup(function() {
    subject = utils.config;
  });

  setup(function() {
    xhr = sinon.useFakeXMLHttpRequest();
    subject.reset();
  });

  test('Loading an existent configuration resource', function(done) {
    xhr.onCreate = function(request) {
      requestHandler(request, existingResource);
    };

    subject.load(existingResource).then(function ready(config1) {
      assert.deepEqual(config1, configObj);

      // Here we are testing the code patch when the file is already loaded
      subject.load(existingResource).then(function ready(config2) {
        assert.isTrue(config1 === config2);
      }, function error() {
          done(new Error('Promise should not be rejected'));
      });

      done();
    }, function error() {
        done(new Error('Promise should not be rejected'));
    });
  });

  test('Loading a non existent configuration resource', function(done) {
    xhr.onCreate = function(request) {
      requestHandler(request, nonExistingResource);
    };

    subject.load(nonExistingResource).then(function ready(config) {
      done(new Error('Promise should not be resolved'));
    }, function error() {
        xhr.restore();
        done();
    });
  });

  test('Same file loaded various times sequentially. Callbacks are called',
    function(done) {
      xhr.onCreate = function(request) {
        requestHandler(request, existingResource);
      };
      var promise1Resolved = false, promise2Resolved = false, config1, config2;

      subject.load(existingResource).then(function ready(config) {
        config1 = config;
        assert.deepEqual(config, configObj);
        promise1Resolved = true;
        if (promise2Resolved) {
          assert.isTrue(config1 === config2);
          xhr.restore();
          done();
        }
      }, function error() {
          done(new Error('Promise should not be rejected'));
      });

      subject.load(existingResource).then(function ready(config) {
        config2 = config;
        assert.deepEqual(config, configObj);
        promise2Resolved = true;
        if (promise1Resolved) {
          assert.isTrue(config1 === config2);
          xhr.restore();
          done();
        }
      }, function error() {
          done(new Error('Promise should not be rejected'));
    });
  });

  test('Same file non-existent loaded various times sequentially.',
    function(done) {
      xhr.onCreate = function(request) {
        requestHandler(request, nonExistingResource);
      };
      var promise1Rejected = false, promise2Rejected = false;

      subject.load(nonExistingResource).then(function ready(config) {
        done(new Error('Promise should not be resolved'));
      }, function error() {
          promise1Rejected = true;
          if (promise2Rejected) {
            xhr.restore();
            done();
          }
      });

      subject.load(nonExistingResource).then(function ready(config) {
        done(new Error('Promise should not be resolved'));
      }, function error() {
          promise2Rejected = true;
          if (promise1Rejected) {
            xhr.restore();
            done();
          }
      });
    });
});
