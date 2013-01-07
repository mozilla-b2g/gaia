'use strict';

window.opener.postMessage('closed', fb.oauthflow.params['contactsAppOrigin']);
window.close();
