'use strict';

var utils = this.utils || {};

(function() {
  var scr = utils.script = {};

  function getFileId(resourceSrc) {
    var fileIdSplit = resourceSrc.split('/');
    return fileIdSplit[fileIdSplit.length - 1];
  }

  // order can be one of 'sequential', 'concurrent'
  utils.script.Loader = function(psources, porder) {
    var numLoaded = 0;
    var self = this;
    var nextToBeLoaded = 0;
    var sourcesArray = Array.isArray(psources) ? psources : [psources];
    var totalToBeLoaded = sourcesArray.length;
    var order = porder || 'concurrent';

    function addEventListeners(node) {
      node.addEventListener('load', resourceLoaded);
      node.addEventListener('error', resourceError);
    }

    function removeEventListeners(node) {
      node.removeEventListener('load', resourceLoaded);
      node.removeEventListener('error', resourceError);
    }

    function loadScript(scriptSrc) {
      var scriptNode = document.createElement('script');
      scriptNode.src = scriptSrc;
      addEventListeners(scriptNode);

      document.head.appendChild(scriptNode);
    }

    function loadStyle(styleSrc) {
      var styleNode = document.createElement('link');
      styleNode.href = styleSrc;
      styleNode.rel = 'stylesheet';
      styleNode.type = 'text/css';

      addEventListeners(styleNode);
      document.head.appendChild(styleNode);
    }

    function loadResource(resourceSrc) {
      var extension = resourceSrc.match(/\.(.*?)$/)[1];
      if(extension === 'js') {
        var node = document.head.querySelector('script[src=' + '"' +
                                               resourceSrc + '"]');
        if(node) {
          // Would be nice if Firefox would have a readyState attribute as IE
          addEventListeners(node);
        }
        else {
          loadScript(resourceSrc);
        }
      }
      else if(extension === 'css') {
        var node = document.head.querySelector('link[href=' + '"'
                                               + resourceSrc + '"]');
        if(node) {
          // Would be nice if Firefox would have a readyState attribute as IE
          addEventListeners(node);
        }
        else {
          loadStyle(resourceSrc);
        }
      }
    }

    function resourceLoaded(e) {
      removeEventListeners(e.target);
      numLoaded++;
      if(typeof self.onresourceloaded === 'function') {
        window.setTimeout(function cb_loaded() {
          self.onresourceloaded(e.target.src || e.target.href);
        }, 0);
      }
      nextToBeLoaded++;
      if(order === 'sequential' && nextToBeLoaded < totalToBeLoaded) {
        loadResource(sourcesArray[nextToBeLoaded]);
      }
      else {
        // Order is concurrent (just check for the number of resources loaded)
        if(numLoaded === totalToBeLoaded) {
          if(typeof self.onfinish === 'function') {
            window.setTimeout(self.onfinish, 0);
          }
        }
      }
    }

    function resourceError(e) {
      removeEventListeners(e.target);

      if(typeof self.onerror === 'function') {
        window.setTimeout(function cb_error() {
          self.onerror(e.target.src);
        }, 0);
      }
    }

    this.start = function() {
      if(order === 'sequential') {
        loadResource(sourcesArray[0]);
      }
      else {
        // All of them are loaded concurrently
        sourcesArray.forEach(function(aSource) {
          loadResource(aSource);
        });
      }
    }
  }


  var resourcesLoaded = {};

  utils.script.load = function(psources, order) {
    var outReq = new Request();
    var sourcesArray = Array.isArray(psources) ? psources : [psources];

    window.setTimeout(function do_load() {
      var toBeLoaded = getToBeLoaded(sourcesArray, outReq);
      if(toBeLoaded.length > 0) {
        var loader = new utils.script.Loader(toBeLoaded, order);
        loader.onfinish = function() {
          outReq.done();
        }
        loader.onerror = function(e) {
          outReq.failed(getFiledId(e.target.src || e.target.href));
        }
        loader.onresourceloaded = function(resourceSrc) {
          window.console.log('!!!Resource Loaded!!!', resourceSrc);
          var fileId = getFileId(resourceSrc);
          resourcesLoaded[fileId] = true;
          outReq.resourceLoaded(fileId);
        }
        loader.start();
      }
      else {
        outReq.done();
      }
    }, 0);

    return outReq;
  }

  function getToBeLoaded(requestedSources, outReq) {
    var realToBeLoaded = [];

    requestedSources.forEach(function(aSource) {
      var fileId = getFileId(aSource);
      if(resourcesLoaded[fileId] !== true) {
        realToBeLoaded.push(aSource);
      }
      else {
        // Immediately fire onresourceloaded on all ready loaded
        if(typeof outReq.onresourceloaded === 'function') {
          outReq.resourceLoaded(fileId);
        }
      }
    });

    window.console.log('!!!!', realToBeLoaded.length, '!!!!');

    return realToBeLoaded;
  }

  utils.script.isLoaded = function(resourceSrc) {
    return resourcesLoaded[resourceSrc] === true;
  }

  /**
  *   Request auxiliary object to support asynchronous calls
  *
  */
  var Request = function() {
    this.done = function(result) {
      this.result = result;
      if (typeof this.onsuccess === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onsuccess(ev);
        }.bind(this), 0);
      }
    };

    this.resourceLoaded = function(resourceSrc) {
      this.resourceSrc = resourceSrc;
      if(typeof this.onresourceloaded === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onresourceloaded(ev);
        }.bind(this), 0);
      }
    }

    this.failed = function(error) {
      this.error = error;
      if (typeof this.onerror === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onerror(ev);
        }.bind(this), 0);
      }
    };
  };
})();
