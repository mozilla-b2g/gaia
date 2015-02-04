# Supported Commands

## setScriptTimeout (done)
req: value
resp : ok
## setSearchTimeout (done)
req: value
resp : ok
## getWindow (done)
resp: value
## getWindows (done)
resp: value
## switchToWindow (done)
req: value
resp: ok
## setContext (done)
resp: ok
req: value
## switchToFrame ?
## getUrl (done)
resp: value
## goBack (done)
resp: ok
## goForward (done)
resp: ok
## refresh (done)
resp: ok
## log (done)
resp: ok
req: { value: msg, level: 'debug' }
## getLogs (done)
resp: value
