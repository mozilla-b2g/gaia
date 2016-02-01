# FxSyncWebCrypto
Uses WebCrypto to decrypt data from [Firefox Sync's Global Storage format](http://docs.services.mozilla.com/sync/storageformat5.html).

## Usage
The code in this folder relies on three things:

* [WebCrypto](http://www.w3.org/TR/WebCryptoAPI/)
* A client for Firefox Accounts (for instance gaia's [FxAccountsClients](
    https://github.com/mozilla-b2g/gaia/blob/master/apps/system/js
    /fx_accounts_manager.js))
* A client for Firefox Sync (for instance [kinto.js](
    https://github.com/Kinto/kinto.js) + [syncto](
    https://github.com/mozilla-services/syncto), [straight XHR](
    http://mxr.mozilla.org/mozilla-central/source/services/sync/tests/unit
    /test_httpd_sync_server.js), or [a python-based one](
    https://github.com/mozilla-services/syncclient))

The steps are as follows:

### Get the kB key from FxA

Use the [onepw protocol](
https://github.com/mozilla/fxa-auth-server/wiki/onepw-protocol) to retrieve a
pair of encryption keys (`kA` and `kB`) from the FxA service. Your
FxAccountsClient is hopefully able to do this for you. Discard `kA` and hold on
to `kB` (it should be a hex string of 64 characters).

### Check the storage format

This library currently only supports [storage format 5](
http://docs.services.mozilla.com/sync/storageformat5.html), so first retrieve
the [metaglobal record](
http://docs.services.mozilla.com/sync/storageformat5.html#metaglobal-record) to
make sure that the rest of the data on the FxSync account is in the right
format. Example using mozilla-services's syncclient:

```bash
$ python sync/main.py email@example.com $PASSWORD get_record meta global
{u'id': u'global',
 u'modified': 1437655930.34,
 u'payload': u'{"syncID":"35sY_luKUnYO","storageVersion":5,"declined":[ \
     "prefs","bookmarks","addons"],"engines":{"clients":{"version":1,"syncID": \
     "VWMk-0KZ8aKh"},"tabs":{"version":1,"syncID":"eGExUapwMq0O"},"forms":{ \
     "version":1,"syncID":"Tgd0wt_q7nQO"},"history":{"version":1,"syncID": \
     "vAIUDLBox_g4"},"passwords":{"version":1,"syncID":"vNno7ecPn7P2"}}}'}
````

In this example we're good, because the value of `storageVersion` there is 5.

### Retrieve the CryptoKeys object.

Similar to how you just retrieved `meta/global`, retrieve `crypto/keys`:

```bash
$ python sync/main.py email@example.com $PASSWORD get_record crypto keys
{u'id': u'keys',
 u'modified': 1439218393.69,
 u'payload': u'{"ciphertext":"PP5yNUYwJJoLcsL5o85i6RZfvanYDrwtChDD/LdKTZ8JOLub \
     Z9DyRv3HMetSkbhL3HLvVm/FJ1Z4F2Z6IKQCxAc5dNnLsBIUUxhOHLbT0x9/jfnqZ8fLtlbko \
     gI3ZlNvbc8iUF1aX+boe0Pv43vM0VvzxrnJDYzZ2a6jm9nbzUn0ldV9sv6vuvGHE6dANnRkZ3 \
     wA/q0q8UvjdwpzXBixAw==","IV":"FmosM+XBNy81/9oEAgI4Uw==","hmac":"01a816e45 \
     77c6cf3f97b66b4382d0a3e7e9178c75a3d38ed9ac8ad6397c2ecce"}'}
````

Note that the payload is a JSON-encoded object, in which ciphertext and IV are
base64 strings, and hmac is a hex string.

### Construct the FxSyncWebCrypto object

Using `kB` and `cryptoKeys`, you can call the FxSyncWebCrypto constructor:

````js
const kB = '85c4f8c1d8e3e2186824c127af786891dd03c6e05b1b45f28f7181211bf2affb';
const cryptoKeys = {
  ciphertext: 'PP5yNUYwJJoLcsL5o85i6RZfvanYDrwtChDD/LdKTZ8JOLubZ9DyRv3HMetSkb' +
      'hL3HLvVm/FJ1Z4F2Z6IKQCxAc5dNnLsBIUUxhOHLbT0x9/jfnqZ8fLtlbkogI3ZlNvbc8i' +
      'UF1aX+boe0Pv43vM0VvzxrnJDYzZ2a6jm9nbzUn0ldV9sv6vuvGHE6dANnRkZ3wA/q0q8U' +
      'vjdwpzXBixAw==',
  IV: 'FmosM+XBNy81/9oEAgI4Uw==',
  hmac: '01a816e4577c6cf3f97b66b4382d0a3e7e9178c75a3d38ed9ac8ad6397c2ecce'
};
const historyEntry = {
  payload: {
    ciphertext: 'o/VpkqMj1tlT8t2youwsS2FgvQeonoHxqjGsRTu1+4swfyBq/QsnKfgOOMmD' +
        'IXZiPC3hOCNUlf/NtQiEe55hzJZEKLBshaLfXotai6KrprwrmykfiXnwn73n+nYNs8BX' +
        'L5awDHoaJToyFgF4PYokl7mwN7YC2xFiPgwO7Z2u/8r5RfnPV9MoafqvlvUkW+Tqs+QH' +
        'eHS/iuSA0P2h/j5ynt9v4xDWLVfEMce0KOKHQ5Qj7BmEPAieWP1trkkDmTdVi2euWrs+' +
        'fuG4C6PgY4A2j2DbNLVIloqpDVkqM2fgh0YOM9L2NC/uiKEb1Ynr2Fos',
    IV: 'kXL3hb11ltD+Jl0YFk+PlQ==',
    hmac: 'cb727efe7a3f0307921cecbd1a97c03f06a4d75c42026089494d84fcf92dbff9'
  },
  collectionName: 'history'
};

const fswc = new FxSyncWebCrypto();
fswc.setKeys(kB, cryptoKeys).then(function() {
  return fswc.decrypt(historyEntry.payload, historyEntry.collectionName);
}).then(function(recordObj) {
  console.log('Decrypted history entry', recordObj);
  // Should print this to the console:
  // Decrypted history entry Object { id: "_9sCUbahs0ay",
  //      histUri: "https://developer.mozilla.org/en-US…", title:
  //      "Object.prototype.__proto__ - JavaSc…", visits: Array[1] }

  return fswc.encrypt({foo: 'bar'}, 'my collection');
}).then(function(fooBarEncrypted) {
  console.log('Encrypted', {foo: 'bar'}, fooBarEncrypted);
  // Should print this to the console:
  // Encrypted Object { foo: "bar" } Object { hmac:
  //     "fc38ab05c809928fd602427c034db1acb81…", ciphertext:
  //     "QVqNZPUFyYxxGpfRaD5Tqg==", IV: "o82jk3gzy7ELxck9uTCLmg==" }
  return fswc.decrypt(fooBarEncrypted, 'my collection');
}).then(function(decryptedBack) {
  console.log('Decrypted back:', decryptedBack);
  // Should print this to the console:
  // Decrypted back: { foo: "bar" }
}).then(function() {
  console.log('Done');
}, function(err) {
  console.log('error', err);
});
````

Note how you always have to specify the collection name (e.g. 'history' or
'passwords'), so that FxSyncWebCrypto can make sure it uses the right collection
key bundle. This is because the CryptoKeys object potentially contains a
different key bundle for each collection.

## Functions provided
### constructor FxSyncWebCrypto
Arguments: none

### setKeys(kB, cryptoKeys)
This function is where all the exciting stuff happens. First, kB is stretched
using 64-bit HKDF over the string 'identity.mozilla.com/picl/v1/oldsync'. The
result is split in two, where the first half becomes the AES key for decrypting
cryptoKeysCiphertext (with initialization vector cryptoKeysIV), and the second
half becomes the HMAC key for verifying the cryptoKeysHmac signature.

Arguments:
* kB - A 64-byte hex string representing the 1024-bit `kB` key described in [onepw](https://github.com/mozilla/fxa-auth-server/wiki/onepw-protocol)
* cryptoKeys - an object, containing:
  * ciphertext - A Base64 string representing the ciphertext of the [CryptoKeys
      record](http://docs.services.mozilla.com/sync/storageformat5.html
      #crypto-keys-record) for the FxSync account.
  * IV - A Base64 string representing the initialization vector for the
      [CryptoKeys record](http://docs.services.mozilla.com/sync/
      storageformat5.html#crypto-keys-record) for the FxSync account.
  * hmac - a 64-byte hex string representing the 1024-bit hmac signature for the
      [CryptoKeys record](http://docs.services.mozilla.com/sync/
      storageformat5.html#crypto-keys-record) for the FxSync account.
Returns a promise that resolves when initialization was successful, and rejects
if the CryptoKeys could not be decrypted with the stretched kB, or if WebCrypto
is not available.

### encrypt
Arguments:
* record: The object to JSON-stringify, sign, and encrypt
* collectionName: The name of the FxSync collection for which to encrypt (see http://docs.services.mozilla.com/sync/storageformat5.html#encryption).
Returns:
A promise for an object with ciphertext, IV, and hmac, which can be
JSON-stringified to get the payload to be uploaded to the FxSync server.

### decrypt
This function checks the payload.hmac signature, and if that matches, uses
AES-CBC to decrypt payload.ciphertext, given payload.IV.

Arguments:
* payload: An object with fields ciphertext, IV, and hmac, presumably the
JSON-parsed payload of a download from the FxSync server.
* collectionName: The name of the FxSync collection for which to decrypt (see http://docs.services.mozilla.com/sync/storageformat5.html#decryption).
Returns:
A promise for an object (the record again that was originally JSON-stringified
and encrypted on this or on another FxSync client).

## How it works
### Where kB and cryptoKeys come from
In previous versions of FxSync, the 'sync key' was generated on the client, and
could only leave the client where it was generated as a slightly modified Base32
string. This library does not support importing such strings.

In the current version of FxSync, the sync key is stored on the FxAccounts
server as 'kB'. You can retrieve '(kA, kB)' from there using the onepw protocol.
The rest of this doc assumes you already have kB as a Base64 string.

You can get the cryptoKeys by retrieving the crypto/keys record from the FxSync
account for which you are passing kB, and JSON-parsing the result. For instance
using [syncclient](https://github.com/mozilla-services/syncclient) like this:

```bash
$ python sync/main.py email@example.com $PASSWORD get_record crypto keys
{u'id': u'keys',
 u'modified': 1439218393.69,
 u'payload': u'{"ciphertext":"PP5yNUYwJJoLcsL5o85i6RZfvanYDrwtChDD/LdKTZ8JOLub \
     Z9DyRv3HMetSkbhL3HLvVm/FJ1Z4F2Z6IKQCxAc5dNnLsBIUUxhOHLbT0x9/jfnqZ8fLtlbko \
     gI3ZlNvbc8iUF1aX+boe0Pv43vM0VvzxrnJDYzZ2a6jm9nbzUn0ldV9sv6vuvGHE6dANnRkZ3 \
     wA/q0q8UvjdwpzXBixAw==","IV":"FmosM+XBNy81/9oEAgI4Uw==","hmac":"01a816e45 \
     77c6cf3f97b66b4382d0a3e7e9178c75a3d38ed9ac8ad6397c2ecce"}'}
````

### Constructor and setKeys

The constructor does basically nothing. The first interesting crypto stuff comes
when you call setKeys:

````js
const fswc = new FxSyncWebCrypto();
fswc.setKeys(kB, cryptoKeys);
````

The things setKeys does are:
* Convert kB from Base64 to a raw ArrayBuffer.
* Take the HMAC digest of an all-zeroes string using kB as a SHA256 key.
* Import the result as a HMAC-SHA256 key.
* Two rounds of HKDF on an all-zeroes string, with info
      'identity.mozilla.com/picl/v1/oldsync'.
* Split the output in two 256-bit strings.
* Use the first one as the AES key and the second one as the HMAC key of the
       Sync Key Bundle, and store this as this.mainSyncKey.
* Take the ciphertext from there, and construct an ArrayBuffer with the ASCII
       characters of that Base64 string.
* Use the HMAC key of the Sync Key Bundle to calculate its SHA256 HMAC
       signature.
* Convert the result to a hex string.
* Check that it matches the HMAC signature of the Sync Key Bundle. Stop if it
       doesn't.
* Convert the initialization vector (IV in the cryptoKeys) from Base64 to a raw
       ArrayBuffer.
* Use the AES key of the Sync Key Bundle and the IV to decrypt the ciphertext
       of the cryptoKeys with AES-CBC (256 bits).
* On success, JSON-parse the cleartext and store it as this.bulkKeyBundle.
* Convert the default keys from Base64 to raw ArrayBuffer, import them as
       CryptoKey object, and store them on this.bulkKeyBundle.defaultAsKeyBundle
       (first one is the AES with purpose encrypt/decrypt, second one is the
       HMAC key with purpose sign/verify).

The bulkKeyBundle look something like this:

````js
{"id":"keys",
 "collection":"crypto",
 "collections":{},
 "default:['dGhlc2UtYXJlLWV4YWN0bHktMzItY2hhcmFjdGVycy4=',
           'eWV0LWFub3RoZXItc2V0LW9mLTMyLWNoYXJhY3RlcnM=']}

````

### decrypt

The decrypt function does the following:

* JSON-parse the payload into an object with ciphertext (base64), IV (base64),
      and hmac (hex).
* Use this.bulkKeyBundle.defaultAsKeyBundle.HMAC to verify the hmac signature of
      the ciphertext's Base64 characters.
* Use this.bulkKeyBundle.defaultAsKeyBundle.AES and IV to decrypt the
      ciphertext.
* JSON-parse the result and return it.

### encrypt

The encrypt function does the following:

* Generate a random initialization vector (IV).
* JSON-stringify the record to form the cleartext.
* Use this.bulkKeyBundle.defaultAsKeyBundle.AES and IV to encrypt the cleartext
      and obtain the ciphertext.
* Use this.bulkKeyBundle.defaultAsKeyBundle.HMAC to sign the ciphertext's Base64
      characters and obtain hmac.
* JSON-stringify an object with ciphertext (Base64), IV (Base64), and hmac (hex)
      to obtain the payload.
# Random collection of links:

## Further reading
### About FxSync and fxa-auth-server
* http://docs.services.mozilla.com/sync/index.html
* http://docs.services.mozilla.com/sync/storageformat5.html
* https://github.com/mozilla/fxa-auth-server/wiki/onepw-protocol
* https://blog.mozilla.org/services/2014/04/30/firefox-syncs-new-security-model/
* https://wiki.mozilla.org/Labs/Weave/Developer/Crypto (old version)

Especially relevant paragraphs from
https://github.com/mozilla/fxa-auth-server/wiki/onepw-protocol:

    "kA" and "kB" enable the browser to encrypt/decrypt synchronized data
    records. They will be used to derive separate encryption and HMAC keys for
    each data collection (bookmarks, form-fill data, saved-password,  open-tabs,
    etc). This will allow the user to share some data, but not  everything, with
    a third party. The client may intentionally forget kA  and kB (only
    retaining the derived keys) to reduce the power available  to someone who
    steals their device.

Note that we use only kB to stretch it up with HDKF and get both the AES and the
HMAC key from that (see 'how-it-works.md' doc in this same folder). We don't
(currently) use kA at all.

### Implementation in other FxSync clients

* https://github.com/mozilla-services/docs/pull/54#issuecomment-130903973

#### Firefox Desktop (Gecko)
* https://mxr.mozilla.org/mozilla-central/source/services/crypto/modules/Weave \
    Crypto.js#451
* https://mxr.mozilla.org/mozilla-central/source/services/sync/modules/keys.js
* https://mxr.mozilla.org/mozilla-central/source/services/sync/modules/record.js
* http://mxr.mozilla.org/mozilla-central/source/services/sync/tests/unit/test_ \
    httpd_sync_server.js

#### Firefox-Android (fennec)
* https://dxr.mozilla.org/mozilla-central/source/mobile/android/base/sync/cryp \
            to/HKDF.java

#### Firefox-iOS
* https://github.com/mozilla/firefox-ios/blob/master/Sync/KeyBundle.swift
* https://github.com/mozilla/firefox-ios/blob/47cc1150b327eaf94f5ec60df3071ca1 \
      e765b093/FxA/FxA/NSData%2BKeyDerivation.m#L228-L254

#### Firefox OS Loop Client:
* https://github.com/mozilla-b2g/firefoxos-loop-client/blob/master/app/js/help \
      ers/hawk_creds.js#L47

### About WebCrypto
* http://www.w3.org/TR/WebCryptoAPI/
* https://github.com/mozilla/fxa-js-client/tree/master/client/lib

* https://github.com/ttaubert/secret-notes/blob/master/04-secrecy/storage.js
