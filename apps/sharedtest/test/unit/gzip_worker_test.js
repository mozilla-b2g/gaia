/* global Gzip */
'use strict';

require('/shared/js/gzip/gzip.js');
require('/shared/js/gzip/gzip.min.js');

suite('gzip worker', function() {

  test('worker successfully compresses payload', function(done) {
    var payload = 'abcdefghijklmnopqrstuvwxyz1234567890';

    // The first ten bytes are the header of the compressed data. Part of the
    // header will vary each time the test is run (timestamp); parts of the
    // header will vary based on the OS on which the test is running. As such,
    // the test will compare the fixed values of the header that are
    // significant to gzip compressed data.
    //
    // Bytes 0 and 1 should be: 31, 139 -- 'gzip' format
    // Byte 2 should be 8 -- 'inflate' compression algorithm
    var expectedCompressedData =
      new Uint8Array([
        31,139,8,0,58,51,24,86,0,255,5,0,5,17,128,48,176,18,38,35,14,48,119,
        183,244,127,239,247,99,66,25,23,82,105,99,157,15,49,229,82,91,31,115,
        221,246,227,188,110,244,44,0,88,155,95,95,36,0,0,0]);

    Gzip.WORKER_URL = '/shared/js/gzip/gzip_worker.js';
    Gzip.compress(payload).then((gzipData) => {
      assert.equal(gzipData.length, 59);
      assert.equal(gzipData.length, expectedCompressedData.length);

      // Only verify bytes 0 through 2 of the header, as explained above.
      for (var i = 0; i < gzipData.length; i++) {
        if (i < 3 || i > 9) {
          assert.equal(gzipData[i], expectedCompressedData[i]);
        }
      }
      done();
    });
  });

  /*
   * Test the scenario where the gzip compression function throws an error.
   * The gzip worker should reject, providing the error message.
   * Because we can't stub the gzip compression library function (it isn't
   * instantiated until the `Gzip.compress` function is called), a mock worker
   * is used which in turn uses a mock compression library -- which is
   * hard-coded to throw. Because the test is not using the prodution worker,
   * it is imperative that the mock worker be kept in sync with the prodution
   * worker: the only difference should be:
   *  < importScripts('gzip.min.js');
   *  ---
   *  > importScripts('mock_gzip.min.js');
   */
  test('gzip compression throws error', function(done) {
    Gzip.WORKER_URL = '/shared/test/unit/mocks/gzip/mock_gzip_worker.js';
    Gzip.compress().then((gzipData) => {
      assert.isFalse(true);
      done();
    },
    (e) => {
      assert.equal(e, 'Failed to compress: Gzip.compress error');
      done();
    });
  });
});

