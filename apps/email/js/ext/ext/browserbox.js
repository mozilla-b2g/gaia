// Copyright (c) 2014 Andris Reinman

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['browserbox-imap', 'utf7', 'imap-handler', 'mimefuncs', 'axe'], function(ImapClient, utf7, imapHandler, mimefuncs, axe) {
            return factory(ImapClient, utf7, imapHandler, mimefuncs, axe);
        });
    } else if (typeof exports === 'object') {

        module.exports = factory(require('./browserbox-imap'), require('wo-utf7'), require('wo-imap-handler'), require('mimefuncs'), require('axe-logger'));
    } else {
        root.BrowserBox = factory(root.BrowserboxImapClient, root.utf7, root.imapHandler, root.mimefuncs, root.axe);
    }
}(this, function(ImapClient, utf7, imapHandler, mimefuncs, axe) {
    'use strict';

    var DEBUG_TAG = 'browserbox';
    var SPECIAL_USE_FLAGS = ['\\All', '\\Archive', '\\Drafts', '\\Flagged', '\\Junk', '\\Sent', '\\Trash'];
    var SPECIAL_USE_BOXES = {
        '\\Sent': ['aika', 'bidaliak', 'bidalita', 'dihantar', 'e rometsweng', 'e tindami', 'elküldött', 'elküldöttek', 'enviadas', 'enviadas', 'enviados', 'enviats', 'envoyés', 'ethunyelweyo', 'expediate', 'ezipuru', 'gesendete', 'gestuur', 'gönderilmiş öğeler', 'göndərilənlər', 'iberilen', 'inviati', 'išsiųstieji', 'kuthunyelwe', 'lasa', 'lähetetyt', 'messages envoyés', 'naipadala', 'nalefa', 'napadala', 'nosūtītās ziņas', 'odeslané', 'padala', 'poslane', 'poslano', 'poslano', 'poslané', 'poslato', 'saadetud', 'saadetud kirjad', 'sendt', 'sendt', 'sent', 'sent items', 'sent messages', 'sända poster', 'sänt', 'terkirim', 'ti fi ranṣẹ', 'të dërguara', 'verzonden', 'vilivyotumwa', 'wysłane', 'đã gửi', 'σταλθέντα', 'жиберилген', 'жіберілгендер', 'изпратени', 'илгээсэн', 'ирсол шуд', 'испратено', 'надіслані', 'отправленные', 'пасланыя', 'юборилган', 'ուղարկված', 'נשלחו', 'פריטים שנשלחו', 'المرسلة', 'بھیجے گئے', 'سوزمژہ', 'لېګل شوی', 'موارد ارسال شده', 'पाठविले', 'पाठविलेले', 'प्रेषित', 'भेजा गया', 'প্রেরিত', 'প্রেরিত', 'প্ৰেৰিত', 'ਭੇਜੇ', 'મોકલેલા', 'ପଠାଗଲା', 'அனுப்பியவை', 'పంపించబడింది', 'ಕಳುಹಿಸಲಾದ', 'അയച്ചു', 'යැවු පණිවුඩ', 'ส่งแล้ว', 'გაგზავნილი', 'የተላኩ', 'បាន​ផ្ញើ', '寄件備份', '寄件備份', '已发信息', '送信済みﾒｰﾙ', '발신 메시지', '보낸 편지함'],
        '\\Trash': ['articole șterse', 'bin', 'borttagna objekt', 'deleted', 'deleted items', 'deleted messages', 'elementi eliminati', 'elementos borrados', 'elementos eliminados', 'gelöschte objekte', 'item dipadam', 'itens apagados', 'itens excluídos', 'mục đã xóa', 'odstraněné položky', 'pesan terhapus', 'poistetut', 'praht', 'prügikast', 'silinmiş öğeler', 'slettede beskeder', 'slettede elementer', 'trash', 'törölt elemek', 'usunięte wiadomości', 'verwijderde items', 'vymazané správy', 'éléments supprimés', 'видалені', 'жойылғандар', 'удаленные', 'פריטים שנמחקו', 'العناصر المحذوفة', 'موارد حذف شده', 'รายการที่ลบ', '已删除邮件', '已刪除項目', '已刪除項目'],
        '\\Junk': ['bulk mail', 'correo no deseado', 'courrier indésirable', 'istenmeyen', 'istenmeyen e-posta', 'junk', 'levélszemét', 'nevyžiadaná pošta', 'nevyžádaná pošta', 'no deseado', 'posta indesiderata', 'pourriel', 'roskaposti', 'skräppost', 'spam', 'spam', 'spamowanie', 'søppelpost', 'thư rác', 'спам', 'דואר זבל', 'الرسائل العشوائية', 'هرزنامه', 'สแปม', '‎垃圾郵件', '垃圾邮件', '垃圾電郵'],
        '\\Drafts': ['ba brouillon', 'borrador', 'borrador', 'borradores', 'bozze', 'brouillons', 'bản thảo', 'ciorne', 'concepten', 'draf', 'drafts', 'drög', 'entwürfe', 'esborranys', 'garalamalar', 'ihe edeturu', 'iidrafti', 'izinhlaka', 'juodraščiai', 'kladd', 'kladder', 'koncepty', 'koncepty', 'konsep', 'konsepte', 'kopie robocze', 'layihələr', 'luonnokset', 'melnraksti', 'meralo', 'mesazhe të padërguara', 'mga draft', 'mustandid', 'nacrti', 'nacrti', 'osnutki', 'piszkozatok', 'rascunhos', 'rasimu', 'skice', 'taslaklar', 'tsararrun saƙonni', 'utkast', 'vakiraoka', 'vázlatok', 'zirriborroak', 'àwọn àkọpamọ́', 'πρόχειρα', 'жобалар', 'нацрти', 'нооргууд', 'сиёҳнавис', 'хомаки хатлар', 'чарнавікі', 'чернетки', 'чернови', 'черновики', 'черновиктер', 'սևագրեր', 'טיוטות', 'مسودات', 'مسودات', 'موسودې', 'پیش نویسها', 'ڈرافٹ/', 'ड्राफ़्ट', 'प्रारूप', 'খসড়া', 'খসড়া', 'ড্ৰাফ্ট', 'ਡ੍ਰਾਫਟ', 'ડ્રાફ્ટસ', 'ଡ୍ରାଫ୍ଟ', 'வரைவுகள்', 'చిత్తు ప్రతులు', 'ಕರಡುಗಳು', 'കരടുകള്‍', 'කෙටුම් පත්', 'ฉบับร่าง', 'მონახაზები', 'ረቂቆች', 'សារព្រាង', '下書き', '草稿', '草稿', '草稿', '임시 보관함']
    };
    var SPECIAL_USE_BOX_FLAGS = Object.keys(SPECIAL_USE_BOXES);
    var SESSIONCOUNTER = 0;

    /**
     * High level IMAP client
     *
     * @constructor
     *
     * @param {String} [host='localhost'] Hostname to conenct to
     * @param {Number} [port=143] Port number to connect to
     * @param {Object} [options] Optional options object
     */
    function BrowserBox(host, port, options) {
        this.options = options || {};

        // Session identified used for logging
        this.options.sessionId = this.options.sessionId || '[' + (++SESSIONCOUNTER) + ']';

        /**
         * List of extensions the server supports
         */
        this.capability = [];

        /**
         * Server ID (rfc2971) as key value pairs
         */
        this.serverId = false;

        /**
         * Current state
         */
        this.state = false;

        /**
         * Is the connection authenticated
         */
        this.authenticated = false;

        /**
         * Selected mailbox
         */
        this.selectedMailbox = false;

        /**
         * IMAP client object
         */
        this.client = new ImapClient(host, port, this.options);

        this._enteredIdle = false;
        this._idleTimeout = false;

        this._init();
    }

    // State constants

    BrowserBox.prototype.STATE_CONNECTING = 1;
    BrowserBox.prototype.STATE_NOT_AUTHENTICATED = 2;
    BrowserBox.prototype.STATE_AUTHENTICATED = 3;
    BrowserBox.prototype.STATE_SELECTED = 4;
    BrowserBox.prototype.STATE_LOGOUT = 5;

    // Timeout constants

    /**
     * Milliseconds to wait for the greeting from the server until the connection is considered failed
     */
    BrowserBox.prototype.TIMEOUT_CONNECTION = 90 * 1000;

    /**
     * Milliseconds between NOOP commands while idling
     */
    BrowserBox.prototype.TIMEOUT_NOOP = 60 * 1000;

    /**
     * Milliseconds until IDLE command is cancelled
     */
    BrowserBox.prototype.TIMEOUT_IDLE = 60 * 1000;

    /**
     * Initialization method. Setup event handlers and such
     */
    BrowserBox.prototype._init = function() {
        // proxy error events
        this.client.onerror = function(err) {
            this.onerror(err);
        }.bind(this);

        // allows certificate handling for platforms w/o native tls support
        this.client.oncert = function(cert) {
            this.oncert(cert);
        }.bind(this);

        // proxy close events
        this.client.onclose = function() {
            clearTimeout(this._connectionTimeout);
            clearTimeout(this._idleTimeout);
            this.onclose();
        }.bind(this);

        // handle ready event which is fired when server has sent the greeting
        this.client.onready = this._onReady.bind(this);

        // start idling
        this.client.onidle = this._onIdle.bind(this);

        // set default handlers for untagged responses
        // capability updates
        this.client.setHandler('capability', this._untaggedCapabilityHandler.bind(this));
        // notifications
        this.client.setHandler('ok', this._untaggedOkHandler.bind(this));
        // message count has changed
        this.client.setHandler('exists', this._untaggedExistsHandler.bind(this));
        // message has been deleted
        this.client.setHandler('expunge', this._untaggedExpungeHandler.bind(this));
        // message has been updated (eg. flag change), not supported by gmail
        this.client.setHandler('fetch', this._untaggedFetchHandler.bind(this));
    };

    // Event placeholders
    BrowserBox.prototype.onclose = function() {};
    BrowserBox.prototype.onauth = function() {};
    BrowserBox.prototype.onupdate = function() {};
    BrowserBox.prototype.oncert = function() {};
    /* BrowserBox.prototype.onerror = function(err){}; // not defined by default */
    BrowserBox.prototype.onselectmailbox = function() {};
    BrowserBox.prototype.onclosemailbox = function() {};

    // Event handlers

    /**
     * Connection to the server is closed. Proxies to 'onclose'.
     *
     * @event
     */
    BrowserBox.prototype._onClose = function() {
        axe.debug(DEBUG_TAG, this.options.sessionId + ' connection closed. goodbye.');
        this.onclose();
    };

    /**
     * Connection to the server was not established. Proxies to 'onerror'.
     *
     * @event
     */
    BrowserBox.prototype._onTimeout = function() {
        clearTimeout(this._connectionTimeout);
        var error = new Error(this.options.sessionId + ' Timeout creating connection to the IMAP server');
        axe.error(DEBUG_TAG, error);
        this.onerror(error);
        this.client._destroy();
    };

    /**
     * Connection to the server is established. Method performs initial
     * tasks like updating capabilities and authenticating the user
     *
     * @event
     */
    BrowserBox.prototype._onReady = function() {
        clearTimeout(this._connectionTimeout);
        axe.debug(DEBUG_TAG, this.options.sessionId + ' session: connection established');
        this._changeState(this.STATE_NOT_AUTHENTICATED);

        this.updateCapability(function() {
            this.upgradeConnection(function(err) {
                if (err) {
                    // emit an error
                    this.onerror(err);
                    this.close();
                    return;
                }
                this.updateId(this.options.id, function() {
                    this.login(this.options.auth, function(err) {
                        if (err) {
                            // emit an error
                            this.onerror(err);
                            this.close();
                            return;
                        }
                        // emit
                        this.onauth();
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    /**
     * Indicates that the connection started idling. Initiates a cycle
     * of NOOPs or IDLEs to receive notifications about updates in the server
     */
    BrowserBox.prototype._onIdle = function() {
        if (!this.authenticated || this._enteredIdle) {
            // No need to IDLE when not logged in or already idling
            return;
        }

        axe.debug(DEBUG_TAG, this.options.sessionId + ' client: started idling');
        this.enterIdle();
    };

    // Public methods

    /**
     * Initiate connection to the IMAP server
     */
    BrowserBox.prototype.connect = function() {
        axe.debug(DEBUG_TAG, this.options.sessionId + ' connecting to ' + this.client.host + ':' + this.client.port);
        this._changeState(this.STATE_CONNECTING);

        // set timeout to fail connection establishing
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = setTimeout(this._onTimeout.bind(this), this.TIMEOUT_CONNECTION);
        this.client.connect();
    };

    /**
     * Close current connection
     */
    BrowserBox.prototype.close = function(callback) {
        var promise;

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        axe.debug(DEBUG_TAG, this.options.sessionId + ' closing connection');
        this._changeState(this.STATE_LOGOUT);

        this.exec('LOGOUT', function(err) {
            if (typeof callback === 'function') {
                callback(err || null);
            }

            this.client.close();
        }.bind(this));

        return promise;
    };

    /**
     * Run an IMAP command.
     *
     * @param {Object} request Structured request object
     * @param {Array} acceptUntagged a list of untagged responses that will be included in 'payload' property
     * @param {Function} callback Callback function to run once the command has been processed
     */
    BrowserBox.prototype.exec = function() {
        var args = Array.prototype.slice.call(arguments),
            callback = args.pop();

        if (typeof callback !== 'function') {
            args.push(callback);
            callback = undefined;
        }

        args.push(function(response, next) {
            var error = null;

            if (response && response.capability) {
                this.capability = response.capability;
            }

            if (this.client.isError(response)) {
                error = response;
            } else if (['NO', 'BAD'].indexOf((response && response.command || '').toString().toUpperCase().trim()) >= 0) {
                error = new Error(response.humanReadable || 'Error');
                if (response.code) {
                    error.code = response.code;
                }
            }
            if (typeof callback === 'function') {
                callback(error, response, next);
            } else {
                next();
            }
        }.bind(this));

        this.breakIdle(function() {
            this.client.exec.apply(this.client, args);
        }.bind(this));
    };

    // IMAP macros

    /**
     * The connection is idling. Sends a NOOP or IDLE command
     *
     * IDLE details:
     *   https://tools.ietf.org/html/rfc2177
     */
    BrowserBox.prototype.enterIdle = function() {
        if (this._enteredIdle) {
            return;
        }
        this._enteredIdle = this.capability.indexOf('IDLE') >= 0 ? 'IDLE' : 'NOOP';
        axe.debug(DEBUG_TAG, this.options.sessionId + ' entering idle with ' + this._enteredIdle);

        if (this._enteredIdle === 'NOOP') {
            this._idleTimeout = setTimeout(function() {
                this.exec('NOOP');
            }.bind(this), this.TIMEOUT_NOOP);
        } else if (this._enteredIdle === 'IDLE') {
            this.client.exec({
                command: 'IDLE'
            }, function(response, next) {
                next();
            }.bind(this));
            this._idleTimeout = setTimeout(function() {
                axe.debug(DEBUG_TAG, this.options.sessionId + ' sending idle DONE');
                this.client.send('DONE\r\n');
                this._enteredIdle = false;
            }.bind(this), this.TIMEOUT_IDLE);
        }
    };

    /**
     * Stops actions related idling, if IDLE is supported, sends DONE to stop it
     *
     * @param {Function} callback Function to run after required actions are performed
     */
    BrowserBox.prototype.breakIdle = function(callback) {
        if (!this._enteredIdle) {
            return callback();
        }

        clearTimeout(this._idleTimeout);
        if (this._enteredIdle === 'IDLE') {
            axe.debug(DEBUG_TAG, this.options.sessionId + ' sending idle DONE');
            this.client.send('DONE\r\n');
        }
        this._enteredIdle = false;

        axe.debug(DEBUG_TAG, this.options.sessionId + ' idle terminated');

        return callback();
    };

    /**
     * Runs STARTTLS command if needed
     *
     * STARTTLS details:
     *   http://tools.ietf.org/html/rfc3501#section-6.2.1
     *
     * @param {Boolean} [forced] By default the command is not run if capability is already listed. Set to true to skip this validation
     * @param {Function} callback Callback function
     */
    BrowserBox.prototype.upgradeConnection = function(callback) {

        // skip request, if already secured
        if (this.client.secureMode) {
            return callback(null, false);
        }

        // skip if STARTTLS not available or starttls support disabled
        if ((this.capability.indexOf('STARTTLS') < 0 || this.options.ignoreTLS) && !this.options.requireTLS) {
            return callback(null, false);
        }

        this.exec('STARTTLS', function(err, response, next) {
            if (err) {
                callback(err);
                next();
            } else {
                this.capability = [];
                this.client.upgrade(function(err, upgraded) {
                    this.updateCapability(function() {
                        callback(err, upgraded);
                    });
                    next();
                }.bind(this));
            }
        }.bind(this));
    };

    /**
     * Runs CAPABILITY command
     *
     * CAPABILITY details:
     *   http://tools.ietf.org/html/rfc3501#section-6.1.1
     *
     * Doesn't register untagged CAPABILITY handler as this is already
     * handled by global handler
     *
     * @param {Boolean} [forced] By default the command is not run if capability is already listed. Set to true to skip this validation
     * @param {Function} callback Callback function
     */
    BrowserBox.prototype.updateCapability = function(forced, callback) {
        if (!callback && typeof forced === 'function') {
            callback = forced;
            forced = undefined;
        }

        // skip request, if not forced update and capabilities are already loaded
        if (!forced && this.capability.length) {
            return callback(null, false);
        }

        // If STARTTLS is required then skip capability listing as we are going to try
        // STARTTLS anyway and we re-check capabilities after connection is secured
        if (!this.client.secureMode && this.options.requireTLS) {
            return callback(null, false);
        }

        this.exec('CAPABILITY', function(err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, true);
            }
            next();
        });
    };

    /**
     * Runs NAMESPACE command
     *
     * NAMESPACE details:
     *   https://tools.ietf.org/html/rfc2342
     *
     * @param {Function} callback Callback function with the namespace information
     */
    BrowserBox.prototype.listNamespaces = function(callback) {
        var promise;

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        if (this.capability.indexOf('NAMESPACE') < 0) {
            setTimeout(function() {
                callback(null, false);
            }, 0);

            return promise;
        }

        this.exec('NAMESPACE', 'NAMESPACE', function(err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseNAMESPACE(response));
            }
            next();
        }.bind(this));

        return promise;
    };

    /**
     * Runs LOGIN or AUTHENTICATE XOAUTH2 command
     *
     * LOGIN details:
     *   http://tools.ietf.org/html/rfc3501#section-6.2.3
     * XOAUTH2 details:
     *   https://developers.google.com/gmail/xoauth2_protocol#imap_protocol_exchange
     *
     * @param {String} username
     * @param {String} password
     * @param {Function} callback Returns error if login failed
     */
    BrowserBox.prototype.login = function(auth, callback) {
        var command, options = {};

        if (!auth) {
            return callback(new Error('Authentication information not provided'));
        }

        if (this.capability.indexOf('AUTH=XOAUTH2') >= 0 && auth && auth.xoauth2) {
            command = {
                command: 'AUTHENTICATE',
                attributes: [{
                    type: 'ATOM',
                    value: 'XOAUTH2'
                }, {
                    type: 'ATOM',
                    value: this._buildXOAuth2Token(auth.user, auth.xoauth2),
                    sensitive: true
                }]
            };
            options.onplustagged = function(response, next) {
                var payload;
                if (response && response.payload) {
                    try {
                        payload = JSON.parse(mimefuncs.base64Decode(response.payload));
                    } catch (e) {
                        axe.error(DEBUG_TAG, this.options.sessionId + ' error parsing XOAUTH2 payload: ' + e + '\nstack trace: ' + e.stack);
                    }
                }
                // + tagged error response expects an empty line in return
                this.client.send('\r\n');
                next();
            }.bind(this);
        } else {
            command = {
                command: 'login',
                attributes: [{
                    type: 'STRING',
                    value: auth.user || ''
                }, {
                    type: 'STRING',
                    value: auth.pass || '',
                    sensitive: true
                }]
            };
        }

        this.exec(command, 'capability', options, function(err, response, next) {
            var capabilityUpdated = false;

            if (err) {
                callback(err);
                return next();
            }

            this._changeState(this.STATE_AUTHENTICATED);
            this.authenticated = true;

            // update post-auth capabilites
            // capability list shouldn't contain auth related stuff anymore
            // but some new extensions might have popped up that do not
            // make much sense in the non-auth state
            if (response.capability && response.capability.length) {
                // capabilites were listed with the OK [CAPABILITY ...] response
                this.capability = [].concat(response.capability || []);
                capabilityUpdated = true;
                axe.debug(DEBUG_TAG, this.options.sessionId + ' post-auth capabilites updated: ' + this.capability);
                callback(null, true);
            } else if (response.payload && response.payload.CAPABILITY && response.payload.CAPABILITY.length) {
                // capabilites were listed with * CAPABILITY ... response
                this.capability = [].concat(response.payload.CAPABILITY.pop().attributes || []).map(function(capa) {
                    return (capa.value || '').toString().toUpperCase().trim();
                });
                capabilityUpdated = true;
                axe.debug(DEBUG_TAG, this.options.sessionId + ' post-auth capabilites updated: ' + this.capability);
                callback(null, true);
            } else {
                // capabilities were not automatically listed, reload
                this.updateCapability(true, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        axe.debug(DEBUG_TAG, this.options.sessionId + ' post-auth capabilites updated: ' + this.capability);
                        callback(null, true);
                    }
                }.bind(this));
            }

            next();
        }.bind(this));
    };

    /**
     * Runs ID command. Retrieves server ID
     *
     * ID details:
     *   http://tools.ietf.org/html/rfc2971
     *
     * Sets this.serverId value
     *
     * @param {Object} id ID as key value pairs. See http://tools.ietf.org/html/rfc2971#section-3.3 for possible values
     * @param {Function} callback
     */
    BrowserBox.prototype.updateId = function(id, callback) {
        if (this.capability.indexOf('ID') < 0) {
            return callback(null, false);
        }

        var attributes = [
            []
        ];
        if (id) {
            if (typeof id === 'string') {
                id = {
                    name: id
                };
            }
            Object.keys(id).forEach(function(key) {
                attributes[0].push(key);
                attributes[0].push(id[key]);
            });
        } else {
            attributes[0] = null;
        }

        this.exec({
            command: 'ID',
            attributes: attributes
        }, 'ID', function(err, response, next) {
            if (err) {
                axe.error(DEBUG_TAG, this.options.sessionId + ' error updating server id: ' + err + '\n' + err.stack);
                callback(err);
                return next();
            }

            if (!response.payload || !response.payload.ID || !response.payload.ID.length) {
                callback(null, false);
                return next();
            }

            this.serverId = {};

            var key;
            [].concat([].concat(response.payload.ID.shift().attributes || []).shift() || []).forEach(function(val, i) {
                if (i % 2 === 0) {
                    key = (val && val.value || '').toString().toLowerCase().trim();
                } else {
                    this.serverId[key] = (val && val.value || '').toString();
                }
            }.bind(this));

            callback(null, this.serverId);

            next();
        }.bind(this));
    };

    /**
     * Runs LIST and LSUB commands. Retrieves a tree of available mailboxes
     *
     * LIST details:
     *   http://tools.ietf.org/html/rfc3501#section-6.3.8
     * LSUB details:
     *   http://tools.ietf.org/html/rfc3501#section-6.3.9
     *
     * @param {Function} callback Returns mailbox tree object
     */
    BrowserBox.prototype.listMailboxes = function(callback) {
        var promise;

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        this.exec({
            command: 'LIST',
            attributes: ['', '*']
        }, 'LIST', function(err, response, next) {
            if (err) {
                callback(err);
                return next();
            }

            var tree = {
                root: true,
                children: []
            };

            if (!response.payload || !response.payload.LIST || !response.payload.LIST.length) {
                callback(null, false);
                return next();
            }

            response.payload.LIST.forEach(function(item) {
                if (!item || !item.attributes || item.attributes.length < 3) {
                    return;
                }
                var branch = this._ensurePath(tree, (item.attributes[2].value || '').toString(), (item.attributes[1] ? item.attributes[1].value : '/').toString());
                branch.flags = [].concat(item.attributes[0] || []).map(function(flag) {
                    return (flag.value || '').toString();
                });
                branch.listed = true;
                this._checkSpecialUse(branch);
            }.bind(this));

            this.exec({
                command: 'LSUB',
                attributes: ['', '*']
            }, 'LSUB', function(err, response, next) {
                if (err) {
                    axe.error(DEBUG_TAG, this.options.sessionId + ' error while listing subscribed mailboxes: ' + err + '\n' + err.stack);
                    callback(null, tree);
                    return next();
                }

                if (!response.payload || !response.payload.LSUB || !response.payload.LSUB.length) {
                    callback(null, tree);
                    return next();
                }

                response.payload.LSUB.forEach(function(item) {
                    if (!item || !item.attributes || item.attributes.length < 3) {
                        return;
                    }
                    var branch = this._ensurePath(tree, (item.attributes[2].value || '').toString(), (item.attributes[1] ? item.attributes[1].value : '/').toString());
                    [].concat(item.attributes[0] || []).map(function(flag) {
                        flag = (flag.value || '').toString();
                        if (!branch.flags || branch.flags.indexOf(flag) < 0) {
                            branch.flags = [].concat(branch.flags || []).concat(flag);
                        }
                    });
                    branch.subscribed = true;
                }.bind(this));

                callback(null, tree);

                next();
            }.bind(this));

            next();
        }.bind(this));

        return promise;
    };

    /**
     * Create a mailbox with the given path.
     *
     * CREATE details:
     *   http://tools.ietf.org/html/rfc3501#section-6.3.3
     *
     * @param {String} path
     *     The path of the mailbox you would like to create.  This method will
     *     handle utf7 encoding for you.
     * @param {Function} callback
     *     Callback that takes an error argument and a boolean indicating
     *     whether the folder already existed.  If the mailbox creation
     *     succeeds, the error argument will be null.  If creation fails, error
     *     will have an error value.  In the event the server says NO
     *     [ALREADYEXISTS], we treat that as success and return true for the
     *     second argument.
     */
    BrowserBox.prototype.createMailbox = function(path, callback) {
        var promise;

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        this.exec({
            command: 'CREATE',
            attributes: [utf7.imap.encode(path)]
        }, function(err, response, next) {
            if (err && err.code === 'ALREADYEXISTS') {
                callback(null, true);
            } else {
                callback(err, false);
            }
            next();
        });

        return promise;
    };

    /**
     * Runs FETCH command
     *
     * FETCH details:
     *   http://tools.ietf.org/html/rfc3501#section-6.4.5
     * CHANGEDSINCE details:
     *   https://tools.ietf.org/html/rfc4551#section-3.3
     *
     * @param {String} sequence Sequence set, eg 1:* for all messages
     * @param {Object} [items] Message data item names or macro
     * @param {Object} [options] Query modifiers
     * @param {Function} callback Callback function with fetched message info
     */
    BrowserBox.prototype.listMessages = function(sequence, items, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback && typeof items === 'function') {
            callback = items;
            items = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        items = items || {
            fast: true
        };

        options = options || {};

        var command = this._buildFETCHCommand(sequence, items, options);
        this.exec(command, 'FETCH', {
            precheck: options.precheck,
            ctx: options.ctx
        }, function(err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseFETCH(response));
            }
            next();
        }.bind(this));

        return promise;
    };

    /**
     * Runs SEARCH command
     *
     * SEARCH details:
     *   http://tools.ietf.org/html/rfc3501#section-6.4.4
     *
     * @param {Object} query Search terms
     * @param {Object} [options] Query modifiers
     * @param {Function} callback Callback function with the array of matching seq. or uid numbers
     */
    BrowserBox.prototype.search = function(query, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        options = options || {};

        var command = this._buildSEARCHCommand(query, options);
        this.exec(command, 'SEARCH', {
            precheck: options.precheck,
            ctx: options.ctx
        }, function(err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseSEARCH(response));
            }
            next();
        }.bind(this));

        return promise;
    };

    /**
     * Runs STORE command
     *
     * STORE details:
     *   http://tools.ietf.org/html/rfc3501#section-6.4.6
     *
     * @param {String} sequence Message selector which the flag change is applied to
     * @param {Array} flags
     * @param {Object} [options] Query modifiers
     * @param {Function} callback Callback function with the array of matching seq. or uid numbers
     */
    BrowserBox.prototype.setFlags = function(sequence, flags, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        options = options || {};

        var command = this._buildSTORECommand(sequence, flags, options);
        this.exec(command, 'FETCH', {
            precheck: options.precheck,
            ctx: options.ctx
        }, function(err, response, next) {
            if (err) {
                callback(err);
            } else {
                callback(null, this._parseFETCH(response));
            }
            next();
        }.bind(this));

        return promise;
    };

    /**
     * Runs APPEND command
     *
     * APPEND details:
     *   http://tools.ietf.org/html/rfc3501#section-6.3.11
     *
     * @param {String} destination The mailbox where to append the message
     * @param {String} message The message to append
     * @param {Array} options.flags Any flags you want to set on the uploaded message. Defaults to [\Seen]. (optional)
     * @param {Function} callback Callback function with the array of matching seq. or uid numbers
     */
    BrowserBox.prototype.upload = function(destination, message, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        options = options || {};
        options.flags = options.flags || ['\\Seen'];

        var flags = options.flags.map(function(flag) {
            return {
                type: 'atom',
                value: flag
            };
        });

        var command = {
            command: 'APPEND'
        };
        command.attributes = [{
                type: 'atom',
                value: destination
            },
            flags, {
                type: 'literal',
                value: message
            }
        ];

        this.exec(command, {
            precheck: options.precheck,
            ctx: options.ctx
        }, function(err, response, next) {
            callback(err, err ? undefined : true);
            next();
        }.bind(this));

        return promise;
    };

    /**
     * Deletes messages from a selected mailbox
     *
     * EXPUNGE details:
     *   http://tools.ietf.org/html/rfc3501#section-6.4.3
     * UID EXPUNGE details:
     *   https://tools.ietf.org/html/rfc4315#section-2.1
     *
     * If possible (byUid:true and UIDPLUS extension supported), uses UID EXPUNGE
     * command to delete a range of messages, otherwise falls back to EXPUNGE.
     *
     * NB! This method might be destructive - if EXPUNGE is used, then any messages
     * with \Deleted flag set are deleted
     *
     * Callback returns an error if the operation failed
     *
     * @param {String} sequence Message range to be deleted
     * @param {Object} [options] Query modifiers
     * @param {Function} callback Callback function
     */
    BrowserBox.prototype.deleteMessages = function(sequence, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        options = options || {};

        // add \Deleted flag to the messages and run EXPUNGE or UID EXPUNGE
        this.setFlags(sequence, {
            add: '\\Deleted'
        }, options, function(err) {
            if (err) {
                return callback(err);
            }

            this.exec(
                options.byUid && this.capability.indexOf('UIDPLUS') >= 0 ? {
                    command: 'UID EXPUNGE',
                    attributes: [{
                        type: 'sequence',
                        value: sequence
                    }]
                } : 'EXPUNGE',
                function(err, response, next) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, true);
                    }
                    next();
                }.bind(this));
        }.bind(this));

        return promise;
    };

    /**
     * Copies a range of messages from the active mailbox to the destination mailbox.
     * Silent method (unless an error occurs), by default returns no information.
     *
     * COPY details:
     *   http://tools.ietf.org/html/rfc3501#section-6.4.7
     *
     * @param {String} sequence Message range to be copied
     * @param {String} destination Destination mailbox path
     * @param {Object} [options] Query modifiers
     * @param {Boolean} [options.byUid] If true, uses UID COPY instead of COPY
     * @param {Function} callback Callback function
     */
    BrowserBox.prototype.copyMessages = function(sequence, destination, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        options = options || {};

        this.exec({
                command: options.byUid ? 'UID COPY' : 'COPY',
                attributes: [{
                    type: 'sequence',
                    value: sequence
                }, {
                    type: 'atom',
                    value: destination
                }]
            }, {
                precheck: options.precheck,
                ctx: options.ctx
            },
            function(err, response, next) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, response.humanReadable || 'COPY completed');
                }
                next();
            }.bind(this));

        return promise;
    };

    /**
     * Moves a range of messages from the active mailbox to the destination mailbox.
     * Prefers the MOVE extension but if not available, falls back to
     * COPY + EXPUNGE
     *
     * MOVE details:
     *   http://tools.ietf.org/html/rfc6851
     *
     * Callback returns an error if the operation failed
     *
     * @param {String} sequence Message range to be moved
     * @param {String} destination Destination mailbox path
     * @param {Object} [options] Query modifiers
     * @param {Function} callback Callback function
     */
    BrowserBox.prototype.moveMessages = function(sequence, destination, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        options = options || {};
        if (this.capability.indexOf('MOVE') >= 0) {
            // If possible, use MOVE
            this.exec({
                    command: options.byUid ? 'UID MOVE' : 'MOVE',
                    attributes: [{
                        type: 'sequence',
                        value: sequence
                    }, {
                        type: 'atom',
                        value: destination
                    }]
                }, ['OK'], {
                    precheck: options.precheck,
                    ctx: options.ctx
                },
                function(err, response, next) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, true);
                    }
                    next();
                }.bind(this));
        } else {
            // Fallback to COPY + EXPUNGE
            this.copyMessages(sequence, destination, options, function(err) {
                if (err) {
                    return callback(err);
                }
                delete options.precheck;
                this.deleteMessages(sequence, options, callback);
            }.bind(this));
        }

        return promise;
    };

    /**
     * Runs SELECT or EXAMINE to open a mailbox
     *
     * SELECT details:
     *   http://tools.ietf.org/html/rfc3501#section-6.3.1
     * EXAMINE details:
     *   http://tools.ietf.org/html/rfc3501#section-6.3.2
     *
     * @param {String} path Full path to mailbox
     * @param {Object} [options] Options object
     * @param {Function} callback Return information about selected mailbox
     */
    BrowserBox.prototype.selectMailbox = function(path, options, callback) {
        var promise;

        if (!callback && typeof options === 'function') {
            callback = options;
            options = undefined;
        }

        if (!callback) {
            promise = new Promise(function(resolve, reject) {
                callback = callbackPromise(resolve, reject);
            });
        }

        options = options || {};

        var query = {
            command: options.readOnly ? 'EXAMINE' : 'SELECT',
            attributes: [{
                type: 'STRING',
                value: path
            }]
        };

        if (options.condstore && this.capability.indexOf('CONDSTORE') >= 0) {
            query.attributes.push([{
                type: 'ATOM',
                value: 'CONDSTORE'
            }]);
        }

        this.exec(query, ['EXISTS', 'FLAGS', 'OK'], {
            precheck: options.precheck,
            ctx: options.ctx
        }, function(err, response, next) {
            if (err) {
                callback(err);
                return next();
            }

            this._changeState(this.STATE_SELECTED);

            if (this.selectedMailbox && this.selectedMailbox !== path) {
                this.onclosemailbox(this.selectedMailbox);
            }

            this.selectedMailbox = path;

            var mailboxInfo = this._parseSELECT(response);

            callback(null, mailboxInfo);

            this.onselectmailbox(path, mailboxInfo);

            next();
        }.bind(this));

        return promise;
    };

    BrowserBox.prototype.hasCapability = function(capa) {
        return this.capability.indexOf((capa || '').toString().toUpperCase().trim()) >= 0;
    };

    // Default handlers for untagged responses

    /**
     * Checks if an untagged OK includes [CAPABILITY] tag and updates capability object
     *
     * @param {Object} response Parsed server response
     * @param {Function} next Until called, server responses are not processed
     */
    BrowserBox.prototype._untaggedOkHandler = function(response, next) {
        if (response && response.capability) {
            this.capability = response.capability;
        }
        next();
    };

    /**
     * Updates capability object
     *
     * @param {Object} response Parsed server response
     * @param {Function} next Until called, server responses are not processed
     */
    BrowserBox.prototype._untaggedCapabilityHandler = function(response, next) {
        this.capability = [].concat(response && response.attributes || []).map(function(capa) {
            return (capa.value || '').toString().toUpperCase().trim();
        });
        next();
    };

    /**
     * Updates existing message count
     *
     * @param {Object} response Parsed server response
     * @param {Function} next Until called, server responses are not processed
     */
    BrowserBox.prototype._untaggedExistsHandler = function(response, next) {
        if (response && response.hasOwnProperty('nr')) {
            this.onupdate('exists', response.nr);
        }
        next();
    };

    /**
     * Indicates a message has been deleted
     *
     * @param {Object} response Parsed server response
     * @param {Function} next Until called, server responses are not processed
     */
    BrowserBox.prototype._untaggedExpungeHandler = function(response, next) {
        if (response && response.hasOwnProperty('nr')) {
            this.onupdate('expunge', response.nr);
        }
        next();
    };

    /**
     * Indicates that flags have been updated for a message
     *
     * @param {Object} response Parsed server response
     * @param {Function} next Until called, server responses are not processed
     */
    BrowserBox.prototype._untaggedFetchHandler = function(response, next) {
        this.onupdate('fetch', [].concat(this._parseFETCH({
            payload: {
                FETCH: [response]
            }
        }) || []).shift());
        next();
    };

    // Private helpers

    /**
     * Parses SELECT response
     *
     * @param {Object} response
     * @return {Object} Mailbox information object
     */
    BrowserBox.prototype._parseSELECT = function(response) {
        if (!response || !response.payload) {
            return;
        }

        var mailbox = {
                readOnly: response.code === 'READ-ONLY'
            },

            existsResponse = response.payload.EXISTS && response.payload.EXISTS.pop(),
            flagsResponse = response.payload.FLAGS && response.payload.FLAGS.pop(),
            okResponse = response.payload.OK;

        if (existsResponse) {
            mailbox.exists = existsResponse.nr || 0;
        }

        if (flagsResponse && flagsResponse.attributes && flagsResponse.attributes.length) {
            mailbox.flags = flagsResponse.attributes[0].map(function(flag) {
                return (flag.value || '').toString().trim();
            });
        }

        [].concat(okResponse || []).forEach(function(ok) {
            switch (ok && ok.code) {
                case 'PERMANENTFLAGS':
                    mailbox.permanentFlags = [].concat(ok.permanentflags || []);
                    break;
                case 'UIDVALIDITY':
                    mailbox.uidValidity = Number(ok.uidvalidity) || 0;
                    break;
                case 'UIDNEXT':
                    mailbox.uidNext = Number(ok.uidnext) || 0;
                    break;
                case 'HIGHESTMODSEQ':
                    mailbox.highestModseq = ok.highestmodseq || '0'; // keep 64bit uint as a string
                    break;
            }
        });

        return mailbox;
    };

    /**
     * Parses NAMESPACE response
     *
     * @param {Object} response
     * @return {Object} Namespaces object
     */
    BrowserBox.prototype._parseNAMESPACE = function(response) {
        var attributes,
            namespaces = false,
            parseNsElement = function(arr) {
                return !arr ? false : [].concat(arr || []).map(function(ns) {
                    return !ns || !ns.length ? false : {
                        prefix: ns[0].value,
                        // The delimiter can legally be NIL which maps to null
                        delimiter: ns[1] && ns[1].value
                    };
                });
            };

        if (response.payload &&
            response.payload.NAMESPACE &&
            response.payload.NAMESPACE.length &&
            (attributes = [].concat(response.payload.NAMESPACE.pop().attributes || [])).length) {

            namespaces = {
                personal: parseNsElement(attributes[0]),
                users: parseNsElement(attributes[1]),
                shared: parseNsElement(attributes[2])
            };
        }

        return namespaces;
    };

    /**
     * Builds a FETCH command
     *
     * @param {String} sequence Message range selector
     * @param {Array} items List of elements to fetch (eg. `['uid', 'envelope']`).
     * @param {Object} [options] Optional options object. Use `{byUid:true}` for `UID FETCH`
     * @returns {Object} Structured IMAP command
     */
    BrowserBox.prototype._buildFETCHCommand = function(sequence, items, options) {
        var command = {
                command: options.byUid ? 'UID FETCH' : 'FETCH',
                attributes: [{
                    type: 'SEQUENCE',
                    value: sequence
                }]
            },

            query = [];

        [].concat(items || []).forEach(function(item) {
            var cmd;
            item = (item || '').toString().toUpperCase().trim();

            if (/^\w+$/.test(item)) {
                // alphanum strings can be used directly
                query.push({
                    type: 'ATOM',
                    value: item
                });
            } else if (item) {
                try {
                    // parse the value as a fake command, use only the attributes block
                    cmd = imapHandler.parser('* Z ' + item);
                    query = query.concat(cmd.attributes || []);
                } catch (E) {
                    // if parse failed, use the original string as one entity
                    query.push({
                        type: 'ATOM',
                        value: item
                    });
                }
            }
        });

        if (query.length === 1) {
            query = query.pop();
        }

        command.attributes.push(query);

        if (options.changedSince) {
            command.attributes.push([{
                type: 'ATOM',
                value: 'CHANGEDSINCE'
            }, {
                type: 'ATOM',
                value: options.changedSince
            }]);
        }
        return command;
    };

    /**
     * Parses FETCH response
     *
     * @param {Object} response
     * @return {Object} Message object
     */
    BrowserBox.prototype._parseFETCH = function(response) {
        var list;

        if (!response || !response.payload || !response.payload.FETCH || !response.payload.FETCH.length) {
            return [];
        }

        list = [].concat(response.payload.FETCH || []).map(function(item) {
            var
            // ensure the first value is an array
                params = [].concat([].concat(item.attributes || [])[0] || []),
                message = {
                    '#': item.nr
                },
                i, len, key;

            for (i = 0, len = params.length; i < len; i++) {
                if (i % 2 === 0) {
                    key = imapHandler.compiler({
                        attributes: [params[i]]
                    }).toLowerCase().replace(/<\d+>$/, '');
                    continue;
                }
                message[key] = this._parseFetchValue(key, params[i]);
            }

            return message;
        }.bind(this));

        return list;
    };

    /**
     * Parses a single value from the FETCH response object
     *
     * @param {String} key Key name (uppercase)
     * @param {Mized} value Value for the key
     * @return {Mixed} Processed value
     */
    BrowserBox.prototype._parseFetchValue = function(key, value) {
        if (!value) {
            return null;
        }

        if (!Array.isArray(value)) {
            switch (key) {
                case 'uid':
                case 'rfc822.size':
                    return Number(value.value) || 0;
                case 'modseq': // do not cast 64 bit uint to a number
                    return value.value || '0';
            }
            return value.value;
        }

        switch (key) {
            case 'flags':
                value = [].concat(value).map(function(flag) {
                    return flag.value || '';
                });
                break;
            case 'envelope':
                value = this._parseENVELOPE([].concat(value || []));
                break;
            case 'bodystructure':
                value = this._parseBODYSTRUCTURE([].concat(value || []));
                break;
            case 'modseq':
                value = (value.shift() || {}).value || '0';
                break;
        }

        return value;
    };

    /**
     * Parses message envelope from FETCH response. All keys in the resulting
     * object are lowercase. Address fields are all arrays with {name:, address:}
     * structured values. Unicode strings are automatically decoded.
     *
     * @param {Array} value Envelope array
     * @param {Object} Envelope object
     */
    BrowserBox.prototype._parseENVELOPE = function(value) {
        var processAddresses = function(list) {
                return [].concat(list || []).map(function(addr) {
                    return {
                        name: mimefuncs.mimeWordsDecode(addr[0] && addr[0].value || ''),
                        address: (addr[2] && addr[2].value || '') + '@' + (addr[3] && addr[3].value || '')
                    };
                });
            },
            envelope = {};

        if (value[0] && value[0].value) {
            envelope.date = value[0].value;
        }

        if (value[1] && value[1].value) {
            envelope.subject = mimefuncs.mimeWordsDecode(value[1] && value[1].value);
        }

        if (value[2] && value[2].length) {
            envelope.from = processAddresses(value[2]);
        }

        if (value[3] && value[3].length) {
            envelope.sender = processAddresses(value[3]);
        }

        if (value[4] && value[4].length) {
            envelope['reply-to'] = processAddresses(value[4]);
        }

        if (value[5] && value[5].length) {
            envelope.to = processAddresses(value[5]);
        }

        if (value[6] && value[6].length) {
            envelope.cc = processAddresses(value[6]);
        }

        if (value[7] && value[7].length) {
            envelope.bcc = processAddresses(value[7]);
        }

        if (value[8] && value[8].value) {
            envelope['in-reply-to'] = value[8].value;
        }

        if (value[9] && value[9].value) {
            envelope['message-id'] = value[9].value;
        }

        return envelope;
    };

    /**
     * Parses message body structure from FETCH response.
     *
     * TODO: implement actual handler
     *
     * @param {Array} value BODYSTRUCTURE array
     * @param {Object} Envelope object
     */
    BrowserBox.prototype._parseBODYSTRUCTURE = function(value) {
        // doesn't do anything yet

        var that = this;
        var processNode = function(node, path) {
            path = path || [];

            var curNode = {},
                i = 0,
                key, part = 0;

            if (path.length) {
                curNode.part = path.join('.');
            }

            // multipart
            if (Array.isArray(node[0])) {
                curNode.childNodes = [];
                while (Array.isArray(node[i])) {
                    curNode.childNodes.push(processNode(node[i], path.concat(++part)));
                    i++;
                }

                // multipart type
                curNode.type = 'multipart/' + ((node[i++] || {}).value || '').toString().toLowerCase();

                // extension data (not available for BODY requests)

                // body parameter parenthesized list
                if (i < node.length - 1) {
                    if (node[i]) {
                        curNode.parameters = {};
                        [].concat(node[i] || []).forEach(function(val, j) {
                            if (j % 2) {
                                curNode.parameters[key] = mimefuncs.mimeWordsDecode((val && val.value || '').toString());
                            } else {
                                key = (val && val.value || '').toString().toLowerCase();
                            }
                        });
                    }
                    i++;
                }
            } else {

                // content type
                curNode.type = [
                    ((node[i++] || {}).value || '').toString().toLowerCase(), ((node[i++] || {}).value || '').toString().toLowerCase()
                ].join('/');

                // body parameter parenthesized list
                if (node[i]) {
                    curNode.parameters = {};
                    [].concat(node[i] || []).forEach(function(val, j) {
                        if (j % 2) {
                            curNode.parameters[key] = mimefuncs.mimeWordsDecode((val && val.value || '').toString());
                        } else {
                            key = (val && val.value || '').toString().toLowerCase();
                        }
                    });
                }
                i++;

                // id
                if (node[i]) {
                    curNode.id = ((node[i] || {}).value || '').toString();
                }
                i++;

                // description
                if (node[i]) {
                    curNode.description = ((node[i] || {}).value || '').toString();
                }
                i++;

                // encoding
                if (node[i]) {
                    curNode.encoding = ((node[i] || {}).value || '').toString().toLowerCase();
                }
                i++;

                // size
                if (node[i]) {
                    curNode.size = Number((node[i] || {}).value || 0) || 0;
                }
                i++;

                if (curNode.type === 'message/rfc822') {
                    // message/rfc adds additional envelope, bodystructure and line count values

                    // envelope
                    if (node[i]) {
                        curNode.envelope = that._parseENVELOPE([].concat(node[i] || []));
                    }
                    i++;

                    if (node[i]) {
                        curNode.childNodes = [
                            // rfc822 bodyparts share the same path, difference is between MIME and HEADER
                            // path.MIME returns message/rfc822 header
                            // path.HEADER returns inlined message header
                            processNode(node[i], path)
                        ];
                    }
                    i++;

                    // line count
                    if (node[i]) {
                        curNode.lineCount = Number((node[i] || {}).value || 0) || 0;
                    }
                    i++;

                } else if (/^text\//.test(curNode.type)) {
                    // text/* adds additional line count values

                    // line count
                    if (node[i]) {
                        curNode.lineCount = Number((node[i] || {}).value || 0) || 0;
                    }
                    i++;

                }

                // extension data (not available for BODY requests)

                // md5
                if (i < node.length - 1) {
                    if (node[i]) {
                        curNode.md5 = ((node[i] || {}).value || '').toString().toLowerCase();
                    }
                    i++;
                }
            }

            // the following are shared extension values (for both multipart and non-multipart parts)
            // not available for BODY requests

            // body disposition
            if (i < node.length - 1) {
                if (Array.isArray(node[i]) && node[i].length) {
                    curNode.disposition = ((node[i][0] || {}).value || '').toString().toLowerCase();
                    if (Array.isArray(node[i][1])) {
                        curNode.dispositionParameters = {};
                        [].concat(node[i][1] || []).forEach(function(val, j) {
                            if (j % 2) {
                                curNode.dispositionParameters[key] = mimefuncs.mimeWordsDecode((val && val.value || '').toString());
                            } else {
                                key = (val && val.value || '').toString().toLowerCase();
                            }
                        });
                    }
                }
                i++;
            }

            // body language
            if (i < node.length - 1) {
                if (node[i]) {
                    curNode.language = [].concat(node[i] || []).map(function(val) {
                        return (val && val.value || '').toString().toLowerCase();
                    });
                }
                i++;
            }

            // body location
            // NB! defined as a "string list" in RFC3501 but replaced in errata document with "string"
            // Errata: http://www.rfc-editor.org/errata_search.php?rfc=3501
            if (i < node.length - 1) {
                if (node[i]) {
                    curNode.location = ((node[i] || {}).value || '').toString();
                }
                i++;
            }

            return curNode;
        };

        return processNode(value);
    };

    /**
     * Compiles a search query into an IMAP command. Queries are composed as objects
     * where keys are search terms and values are term arguments. Only strings,
     * numbers and Dates are used. If the value is an array, the members of it
     * are processed separately (use this for terms that require multiple params).
     * If the value is a Date, it is converted to the form of "01-Jan-1970".
     * Subqueries (OR, NOT) are made up of objects
     *
     *    {unseen: true, header: ["subject", "hello world"]};
     *    SEARCH UNSEEN HEADER "subject" "hello world"
     *
     * @param {Object} query Search query
     * @param {Object} [options] Option object
     * @param {Boolean} [options.byUid] If ture, use UID SEARCH instead of SEARCH
     * @return {Object} IMAP command object
     */
    BrowserBox.prototype._buildSEARCHCommand = function(query, options) {
        var command = {
            command: options.byUid ? 'UID SEARCH' : 'SEARCH'
        };

        var isAscii = true;

        var buildTerm = function(query) {
            var list = [];

            Object.keys(query).forEach(function(key) {
                var params = [],

                    formatDate = function(date) {
                        return date.toUTCString().replace(/^\w+, 0?(\d+) (\w+) (\d+).*/, "$1-$2-$3");
                    },

                    escapeParam = function(param) {
                        if (typeof param === "number") {
                            return {
                                type: "number",
                                value: param
                            };
                        } else if (typeof param === "string") {
                            if (/[\u0080-\uFFFF]/.test(param)) {
                                isAscii = false;
                                return {
                                    type: "literal",
                                    // cast unicode string to pseudo-binary as imap-handler compiles strings as octets
                                    value: mimefuncs.fromTypedArray(mimefuncs.charset.encode(param))
                                };
                            }
                            return {
                                type: "string",
                                value: param
                            };
                        } else if (Object.prototype.toString.call(param) === "[object Date]") {
                            // RFC 3501 allows for dates to be placed in
                            // double-quotes or left without quotes.  Some
                            // servers (Yandex), do not like the double quotes,
                            // so we treat the date as an atom.
                            return {
                                type: "atom",
                                value: formatDate(param)
                            };
                        } else if (Array.isArray(param)) {
                            return param.map(escapeParam);
                        } else if (typeof param === "object") {
                            return buildTerm(param);
                        }
                    };

                params.push({
                    type: "atom",
                    value: key.toUpperCase()
                });

                [].concat(query[key] || []).forEach(function(param) {
                    switch (key.toLowerCase()) {
                        case 'uid':
                            param = {
                                type: "sequence",
                                value: param
                            };
                            break;
                        default:
                            param = escapeParam(param);
                    }
                    if (param) {
                        params = params.concat(param || []);
                    }
                });
                list = list.concat(params || []);
            });

            return list;
        };

        command.attributes = [].concat(buildTerm(query || {}) || []);

        // If any string input is using 8bit bytes, prepend the optional CHARSET argument
        if (!isAscii) {
            command.attributes.unshift({
                type: "atom",
                value: "UTF-8"
            });
            command.attributes.unshift({
                type: "atom",
                value: "CHARSET"
            });
        }

        return command;
    };

    /**
     * Parses SEARCH response. Gathers all untagged SEARCH responses, fetched seq./uid numbers
     * and compiles these into a sorted array.
     *
     * @param {Object} response
     * @return {Object} Message object
     * @param {Array} Sorted Seq./UID number list
     */
    BrowserBox.prototype._parseSEARCH = function(response) {
        var list = [];

        if (!response || !response.payload || !response.payload.SEARCH || !response.payload.SEARCH.length) {
            return [];
        }

        [].concat(response.payload.SEARCH || []).forEach(function(result) {
            [].concat(result.attributes || []).forEach(function(nr) {
                nr = Number(nr && nr.value || nr || 0) || 0;
                if (list.indexOf(nr) < 0) {
                    list.push(nr);
                }
            });
        }.bind(this));

        list.sort(function(a, b) {
            return a - b;
        });

        return list;
    };

    /**
     * Creates an IMAP STORE command from the selected arguments
     */
    BrowserBox.prototype._buildSTORECommand = function(sequence, flags, options) {
        var command = {
                command: options.byUid ? 'UID STORE' : 'STORE',
                attributes: [{
                    type: 'sequence',
                    value: sequence
                }]
            },
            key = '',
            list = [];

        if (Array.isArray(flags) || typeof flags !== 'object') {
            flags = {
                set: flags
            };
        }

        if (flags.add) {
            list = [].concat(flags.add || []);
            key = '+';
        } else if (flags.set) {
            key = '';
            list = [].concat(flags.set || []);
        } else if (flags.remove) {
            key = '-';
            list = [].concat(flags.remove || []);
        }

        command.attributes.push({
            type: 'atom',
            value: key + 'FLAGS' + (options.silent ? '.SILENT' : '')
        });

        command.attributes.push(list.map(function(flag) {
            return {
                type: 'atom',
                value: flag
            };
        }));

        return command;
    };

    /**
     * Updates the IMAP state value for the current connection
     *
     * @param {Number} newState The state you want to change to
     */
    BrowserBox.prototype._changeState = function(newState) {
        if (newState === this.state) {
            return;
        }

        axe.debug(DEBUG_TAG, this.options.sessionId + ' entering state: ' + this.state);

        // if a mailbox was opened, emit onclosemailbox and clear selectedMailbox value
        if (this.state === this.STATE_SELECTED && this.selectedMailbox) {
            this.onclosemailbox(this.selectedMailbox);
            this.selectedMailbox = false;
        }

        this.state = newState;
    };

    /**
     * Ensures a path exists in the Mailbox tree
     *
     * @param {Object} tree Mailbox tree
     * @param {String} path
     * @param {String} delimiter
     * @return {Object} branch for used path
     */
    BrowserBox.prototype._ensurePath = function(tree, path, delimiter) {
        var names = path.split(delimiter);
        var branch = tree;
        var i, j, found;

        for (i = 0; i < names.length; i++) {
            found = false;
            for (j = 0; j < branch.children.length; j++) {
                if (this._compareMailboxNames(branch.children[j].name, utf7.imap.decode(names[i]))) {
                    branch = branch.children[j];
                    found = true;
                    break;
                }
            }
            if (!found) {
                branch.children.push({
                    name: utf7.imap.decode(names[i]),
                    delimiter: delimiter,
                    path: names.slice(0, i + 1).join(delimiter),
                    children: []
                });
                branch = branch.children[branch.children.length - 1];
            }
        }
        return branch;
    };

    /**
     * Compares two mailbox names. Case insensitive in case of INBOX, otherwise case sensitive
     *
     * @param {String} a Mailbox name
     * @param {String} b Mailbox name
     * @returns {Boolean} True if the folder names match
     */
    BrowserBox.prototype._compareMailboxNames = function(a, b) {
        return (a.toUpperCase() === 'INBOX' ? 'INBOX' : a) === (b.toUpperCase() === 'INBOX' ? 'INBOX' : b);
    };

    /**
     * Checks if a mailbox is for special use
     *
     * @param {Object} mailbox
     * @return {String} Special use flag (if detected)
     */
    BrowserBox.prototype._checkSpecialUse = function(mailbox) {
        var i, type;

        if (mailbox.flags) {
            for (i = 0; i < SPECIAL_USE_FLAGS.length; i++) {
                type = SPECIAL_USE_FLAGS[i];
                if ((mailbox.flags || []).indexOf(type) >= 0) {
                    mailbox.specialUse = type;
                    return type;
                }
            }
        }

        return this._checkSpecialUseByName(mailbox);
    };

    BrowserBox.prototype._checkSpecialUseByName = function(mailbox) {
        var name = (mailbox.name || '').toLowerCase().trim(),
            i, type;

        for (i = 0; i < SPECIAL_USE_BOX_FLAGS.length; i++) {
            type = SPECIAL_USE_BOX_FLAGS[i];
            if (SPECIAL_USE_BOXES[type].indexOf(name) >= 0) {
                mailbox.flags = [].concat(mailbox.flags || []).concat(type);
                mailbox.specialUse = type;
                return type;
            }
        }

        return false;
    };

    /**
     * Builds a login token for XOAUTH2 authentication command
     *
     * @param {String} user E-mail address of the user
     * @param {String} token Valid access token for the user
     * @return {String} Base64 formatted login token
     */
    BrowserBox.prototype._buildXOAuth2Token = function(user, token) {
        var authData = [
            'user=' + (user || ''),
            'auth=Bearer ' + token,
            '',
            ''
        ];
        return mimefuncs.base64.encode(authData.join('\x01'));
    };

    /**
     * Wrapper for creating promise aware callback functions
     *
     * @param {Function} resolve Promise.resolve
     * @param {Function} reject promise.reject
     * @returns {Function} Promise wrapped callback
     */
    function callbackPromise(resolve, reject) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            var err = args.shift();
            if (err) {
                reject(err);
            } else {
                resolve.apply(null, args);
            }
        };
    }

    return BrowserBox;
}));
