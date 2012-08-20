var fb = window.fb || {};

/**
  * Request auxiliary object to support asynchronous calls
  *
  */
    fb.Request = function() {
      this.done = function(result) {
        this.result = result;
        if (typeof this.onsuccess === 'function') {
          this.onsuccess();
        }
      }

      this.failed = function(error) {
        this.error = error;
        if (typeof this.onerror === 'function') {
          this.onerror();
        }
      }
    };
