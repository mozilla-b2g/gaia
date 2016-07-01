define(function(require, exports) {
'use strict';

exports.assertEventuallyRead = function(stream, items) {
  if (!Array.isArray(items)) {
    items = [items];
  }

  var read = [];
  return new Promise((resolve, reject) => {
    stream.listen(data => {
      read.push(data);
      if (read.length < items.length) {
        return;
      }

      try {
        expect(read).to.deep.equal(items);
      } catch (error) {
        reject(error);
      } finally {
        stream.cancel();
      }

      resolve();
    });
  });
};

});
