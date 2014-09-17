'use strict';
(function(window){

  var Loader = window.CommonResourceLoader = {},
      domain = document.location.host;

  Loader.domain = document.location.protocol + '//' + domain;
  Loader.url = function(url){
    return this.domain + url;
  };

  Loader.script = function(url){
    var script = document.createElement('script');
    script.type = 'application/javascript;version=1.8';
    script.async = false;
    script.src = this.url(url);

    var promise = new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });

    document.body.appendChild(script);
    return promise;
  };

  Loader.stylesheet = function(url){
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = this.url(url);

    var promise = new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = reject;
    });

    document.body.appendChild(link);
    return promise;
  };
}(this));


Promise.all([
  CommonResourceLoader.stylesheet('/common/vendor/test-agent/test-agent.css'),
  CommonResourceLoader.stylesheet('/common/vendor/mocha/mocha.css'),
  CommonResourceLoader.script('/common/vendor/mocha/mocha.js'),
  CommonResourceLoader.script('/common/vendor/sinon/sinon.js'),
  CommonResourceLoader.script('/common/vendor/blanket/blanket.js'),
  CommonResourceLoader.script('/common/vendor/test-agent/test-agent.js'),
  CommonResourceLoader.script('/common/test/test_url_resolver.js'),
  CommonResourceLoader.script('/common/test/agent.js')
]).catch(function() {
  document.getElementById('loading-error-message').hidden = false;
});

