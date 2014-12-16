'use strict';

requireApp('/gallery/js/image_processor.js');
requireApp('/gallery/js/image_processor_thread.js');

function defineTestSuite(implementationName) {
  suite(implementationName, function() {
    var processor;

    suiteSetup(function() {
      if (implementationName === 'ImageProcessorThread') {
        // The path to the worker code is different in this test case
        // so tweak the URL just for this test.
        window.ImageProcessorThread.WORKER_URL =
          '../../' + window.ImageProcessorThread.WORKER_URL;
      }
      processor = new window[implementationName](1024*1024);
    });

    var imageProcessingTests = [
      {
        name: 'implicit noop test',
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
      },

      {
        name: 'explicit noop test',
        gamma: 1.0,
        levels: {
          red: {min: 0, max:255},
          green: {min: 0, max:255},
          blue: {min: 0, max:255}
        },
        matrix: [1,0,0,0,0,1,0,0,0,0,1,0],
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
      },

      {
        name: 'gamma=1.0',
        gamma: 1.0,
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
      },

      {
        name: 'gamma=0.5',
        gamma: 0.5,
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0,
                   Math.round(255*Math.pow(50/255, 0.5)),
                   Math.round(255*Math.pow(100/255, 0.5)),
                   Math.round(255*Math.pow(150/255, 0.5)),
                   0]
      },

      {
        name: 'gamma=2.0',
        gamma: 2.0,
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0,
                   Math.round(255*Math.pow(50/255, 2.0)),
                   Math.round(255*Math.pow(100/255, 2.0)),
                   Math.round(255*Math.pow(150/255, 2.0)),
                   0],
      },

      { // should not modify the image because range too small
        name: 'narrow levels',
        levels: {
          red: {min: 100, max:105},
          green: {min: 60, max:65},
          blue: {min: 200, max:205}
        },
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
      },

      {
        name: 'no-op levels',
        levels: {
          red: {min: 0, max:255},
          green: {min: 0, max:255},
          blue: {min: 0, max:255}
        },
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
      },

      {
        name: 'levels',
        levels: {
          red: {min: 0, max: 255},
          green: { min: 50, max: 200},
          blue: {min: 100, max: 150 }
        },
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0,
                   50, Math.round(255 * (100-50)/150), 255, 0]
      },

      {
        name: 'levels plus gamma',
        levels: {
          red: {min: 0, max: 255},
          green: { min: 50, max: 200},
          blue: {min: 100, max: 150 }
        },
        gamma: 1.25,
        input: [0,0,0,0, 255,255,255,0, 50, 100, 150, 0],
        expected: [0,0,0,0, 255,255,255,0,
                   Math.round(255*Math.pow(50/255, 1.25)),
                   Math.round(255*Math.pow(Math.round(255*(100-50)/150)/255,
                                           1.25)),
                   255, 0]
      },

      {
        name: 'identity matrix',
        matrix: [1,0,0,0,0,1,0,0,0,0,1,0],
        input: [1,2,3,0],
        expected: [1,2,3,0]
      },

      {
        name: 'matrix m0',
        matrix: [2,0,0,0, 0,0,0,0, 0,0,0,0],
        input: [1,2,3,0],
        expected: [2,0,0,0]
      },

      {
        name: 'matrix m1',
        matrix: [0,2,0,0, 0,0,0,0, 0,0,0,0],
        input: [1,2,3,0],
        expected: [4,0,0,0]
      },

      {
        name: 'matrix m2',
        matrix: [0,0,2,0, 0,0,0,0, 0,0,0,0],
        input: [1,2,3,0],
        expected: [6,0,0,0]
      },

      {
        name: 'matrix m3',
        matrix: [0,0,0,0.5, 0,0,0,0, 0,0,0,0],
        input: [1,2,3,0],
        expected: [128,0,0,0]
      },

      {
        name: 'matrix m4',
        matrix: [0,0,0,0, 2,0,0,0, 0,0,0,0],
        input: [1,2,3,0],
        expected: [0,2,0,0]
      },

      {
        name: 'matrix m5',
        matrix: [0,0,0,0, 0,2,0,0, 0,0,0,0],
        input: [1,2,3,0],
        expected: [0,4,0,0]
      },

      {
        name: 'matrix m6',
        matrix: [0,0,0,0, 0,0,2,0, 0,0,0,0],
        input: [1,2,3,0],
        expected: [0,6,0,0]
      },

      {
        name: 'matrix m7',
        matrix: [0,0,0,0, 0,0,0,0.5, 0,0,0,0],
        input: [1,2,3,0],
        expected: [0,128,0,0]
      },

      {
        name: 'matrix m8',
        matrix: [0,0,0,0, 0,0,0,0, 2,0,0,0],
        input: [1,2,3,0],
        expected: [0,0,2,0]
      },

      {
        name: 'matrix m9',
        matrix: [0,0,0,0, 0,0,0,0, 0,2,0,0],
        input: [1,2,3,0],
        expected: [0,0,4,0]
      },

      {
        name: 'matrix m10',
        matrix: [0,0,0,0, 0,0,0,0, 0,0,2,0],
        input: [1,2,3,0],
        expected: [0,0,6,0]
      },

      {
        name: 'matrix m11',
        matrix: [0,0,0,0, 0,0,0,0, 0,0,0,0.5],
        input: [1,2,3,0],
        expected: [0,0,128,0]
      },

      {
        name: 'full matrix',
        matrix: [1,2,3,0.1, 4,5,6,0.2, 7,8,9,0.4],
        input: [1,2,3,0],
        expected: [40,83,152,0]
      },

      {
        name: 'matrix overflow',
        matrix: [1,2,3,1, 4,5,6,1, 7,8,9,1],
        input: [1,2,3,0],
        expected: [255,255,255,0]
      },

      {
        name: 'everything',
        gamma: 0.75,
        levels: {
          red: {min: 20, max: 225},
          green: { min: 50, max: 200},
          blue: {min: 10, max: 180 }
        },
        matrix: [0.1,0.2,0.3,0, 0.4,0.5,0.6,0, 0.7,0.8,0.9,0],
        input: [50,100,150,0],
        expected: [94,212,255,0]
      }
    ];

    // Register all the tests defined in the array above
    imageProcessingTests.forEach(function(t) {
      test(t.name, function(done) {
        if (t.gamma) {
          processor.setGamma(t.gamma);
        }
        else {
          processor.setGamma(1.0);
        }
        if (t.levels) {
          processor.setLevels(t.levels);
        }
        else {
          processor.setLevels(null);
        }
        if (t.matrix) {
          processor.setMatrix(t.matrix);
        }
        else {
          processor.setMatrix(null);
        }

        processor.processImage(new Uint8Array(t.input).buffer).then(
          function(result) {
            done(function() {
              assert.deepEqual(new Uint8Array(result),
                               new Uint8Array(t.expected));
            });
          },
          function(error) {
            done(error);
          });
      });
    });

    test('compute histogram', function(done) {
      // Generate some random input and keep track of the histogram
      // we expect from that input;
      var N = 16*1024;
      var input = new Uint8Array(N*4);
      var red = new Uint32Array(256);
      var green = new Uint32Array(256);
      var blue = new Uint32Array(256);
      for(var i = 0; i < N; i++) {
        var r = Math.floor(Math.random()*256);
        var g = Math.floor(Math.random()*256);
        var b = Math.floor(Math.random()*256);
        input[i*4] = r;
        input[i*4+1] = g;
        input[i*4+2] = b;
        red[r]++;
        green[g]++;
        blue[b]++;
      }

      // Now compute a histogram on that input and compare to expected
      processor.computeHistogram(input.buffer).then(
        function(result) {
          done(function() {
            assert.deepEqual(new Uint32Array(result, 0, 256), red);
            assert.deepEqual(new Uint32Array(result, 256*4, 256), green);
            assert.deepEqual(new Uint32Array(result, 256*8, 256), blue);
          });
        },
        function(error) {
          done(error);
        });
    });
  });
}

defineTestSuite('ImageProcessor');
defineTestSuite('ImageProcessorThread');

