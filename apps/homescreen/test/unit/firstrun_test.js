/* global FirstRun */
'use strict';

require('/js/firstrun.js');

suite('FirstRun', () => {
  var json;

  setup(() => {
    window.LazyLoader = {
      getJSON: (file) => {
        assert.equal(file, 'js/init.json');
        return Promise.resolve(json);
      }
    };
  });

  test('handles null JSON', (done) => {
    json = null;

    FirstRun().then(results => {
      done(() => {
        assert.isTrue(Array.isArray(results.order));
        assert.equal(results.order.length, 0);
        assert.equal(results.small, false);
      });
    }, done);
  });

  test('handles empty JSON', (done) => {
    json = {};

    FirstRun().then(results => {
      done(() => {
        assert.isTrue(Array.isArray(results.order));
        assert.equal(results.order.length, 0);
        assert.equal(results.small, false);
      });
    }, done);
  });

  test('handle null values in the JSON', (done) => {
    json = { grid:
      [[ null,
         { manifestURL: '1' },
         null,
         null,
         { manifestURL: '2', entry_point: '3' } ],
       [ { manifestURL: '4' } ]
      ]};

    FirstRun().then(results => {
      done(() => {
        var string = '';
        var order = 0;
        results.order.forEach(entry => {
          string += entry.id;
          assert.equal(entry.order, order++);
        });
        assert.equal(string, '1/2/34/');
      });
    });
  });

  test('treats columns <= 3 as default columns setting', (done) => {
    json = { preferences: {} };

    json.preferences['grid.cols'] = 2;
    FirstRun().then(results1 => {
      json.preferences['grid.cols'] = 3;
      FirstRun().then(results2 => {
        done(() => {
          assert.equal(results1.small, false);
          assert.equal(results2.small, false);
        });
      }, done);
    }, done);
  });

  test('treats columns > 3 as small columns setting', (done) => {
    json = { preferences: {} };
    json.preferences['grid.cols'] = 4;

    FirstRun().then(results => {
      done(() => {
        assert.equal(results.small, true);
      });
    });
  });

  test('transforms grid into compatible format', (done) => {
    json = { grid:
      [[ { manifestURL: '1' },
         { manifestURL: '2', entry_point: '3' } ],
       [ { manifestURL: '4' } ]
      ]};

    FirstRun().then(results => {
      done(() => {
        var string = '';
        var order = 0;
        results.order.forEach(entry => {
          string += entry.id;
          assert.equal(entry.order, order++);
        });
        assert.equal(string, '1/2/34/');
      });
    });
  });

  test('omits objects with no manifestURL', (done) => {
    json = { grid:
      [[ { manifestURL: '1' },
         { manifestURL: '2', entry_point: '3' } ],
       [ { invalidObject: true } ],
       [ { manifestURL: '4' } ]
      ]};

    FirstRun().then(results => {
      done(() => {
        var string = '';
        var order = 0;
        results.order.forEach(entry => {
          string += entry.id;
          assert.equal(entry.order, order++);
        });
        assert.equal(string, '1/2/34/');
      });
    });
  });
});
