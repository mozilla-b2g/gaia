(function(window){
  var Loader = window.CommonResourceLoader = {},
      domain = document.location.host;

  Loader.domain = document.location.protocol + '//' + domain;
  Loader.url = function(url){
    return this.domain + url;
  }

  Loader.script = function(url, doc){
    doc = doc || document;
    doc.write('<script type="application/javascript;version=1.8" src="' + this.url(url) + '"><\/script>');
    return this;
  };

  Loader.stylesheet = function(url, doc){
    doc = doc || document;
    doc.write('<link rel="stylesheet" type="text/css" href="' + this.url(url) + '">');
    return this;
    };
}(this));

CommonResourceLoader
  .stylesheet('/common/vendor/test-agent/test-agent.css');

CommonResourceLoader
  .script('/common/vendor/mocha/mocha.js')
  .script('/common/vendor/sinon/sinon.js')
  .script('/common/vendor/blanket/blanket.js')
  .script('/common/vendor/test-agent/test-agent.js')
  .script('/common/test/test_url_resolver.js')
  .script('/common/test/agent.js');

window.onerror = function() {
  var args = Array.prototype.slice.call(arguments);
  var json = JSON.stringify(args);
  var debug = document.createElement('p');
  debug.style.color = 'red';

  document.body.appendChild(debug);
}

