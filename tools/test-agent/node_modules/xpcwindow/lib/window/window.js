window.location = {};
window.document = {
  getElementsByTagName: function() {
    return [];
  }
};

window.document.location = {
  host: 'localhost'
};

window.onerror = function(){};
