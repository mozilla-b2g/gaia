function errorHandler(msg,url,lineNumber) {
			var str = '';

			if(url) {
				str += url + " : ";
			}

			if(lineNumber) {
				str += lineNumber + " : ";
			}

			if(msg) {
				str += msg;
			}

			window.console.error(str);

			return false;
		}

window.addEventListener('error',errorHandler);

/*
if(typeof window.owdRequest === 'undefined') {
  var owr = window.owRequest = function() {

  }

  owr.prototype.continue = function() {

  }
}

var task = new owdTask('ssss')

contactsImporter.start();
*/
