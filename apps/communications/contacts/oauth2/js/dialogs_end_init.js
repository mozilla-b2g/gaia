'use strict';

window.opener.postMessage('closed', oauthflow.params.facebook['appOrigin']);
window.close();
