/**
 * @private
 *
 * Socket Transport
 *
 */
Ext.define('Ext.cf.messaging.transports.SocketIoTransport', {
    mixins: {
        observable: "Ext.util.Observable"
    },
     
    config: {
        url: 'http://msg.sencha.io',
        deviceId: null,
        deviceSid: null
    },

    /** 
     * Constructor
     *
     * @param {Object} config
     *
     */  
    constructor : function(config) {
        config = config || {};
        Ext.apply(this, config);
        /** @private
         * @event receive
         *  Connection recives an envelope from the server.
         * @param {Object} envelope from the server.
         */
        /** @private
         * @event error
         *  An error condition is recived via the socket connnection
         * @param {Object} error The error Message.
         */
        this.mixins.observable.constructor.call(this);
    },


    /** 
    * connects to the server and registers to receive messages for the clientID passed
    *
    * @private
    *
    */
    start: function() {
        Ext.cf.util.Logger.debug("connecting to ", this.url);
        var me = this, error;

        // check if socket.io has been included on the page
        if(typeof(io) === "undefined") {
            error = "SocketIoTransport needs the socket.io 0.8.7 client library to work, but that library was not found. Please include the library and try again.";
            Ext.cf.util.Logger.error(error);  
            throw error;
        }

        // check if we are using the same version as the server
        if(io.version !== '0.8.7') {
            error = "SocketIoTransport needs socket.io version 0.8.7, but the included version is " + io.version;
            Ext.cf.util.Logger.error(error);  
            throw error;
        }

        me.socket = io.connect(me.url);

        me.socket.on('receive', function(data) {
            me._receive(data);
        });

        me.socket.on('connect', function () {
            Ext.cf.util.Logger.debug("start", me.deviceId, me.deviceSid);

            var params = {"deviceId": me.deviceId};
            
            if(me.deviceSid) {
                params.deviceSid = me.deviceSid;
            }

            me.socket.emit('start', params, function(err) {
                if(err) {
                    Ext.cf.util.Logger.error(err.message, err);
                }
            });

            var actualTransportName = me.socket.socket.transport.name;
            if(actualTransportName !== "websocket") {
                Ext.cf.util.Logger.warn("SocketIoTransport: Could not use websockets! Falling back to", actualTransportName);
            }

            me.checkVersion();
        });
    },

    /** 
     * Check version
     *
     */
    checkVersion: function() {
        this._emit('version', { v: Ext.getVersion("sio").toString() }, function(err, status, response) {
            Ext.cf.util.Logger.debug("checkVersion", err, status, response);
            if(err) {
                Ext.cf.util.Logger.error("Error performing client/server compatibility check", err);
            } else {
                if(response && response.code === 'INCOMPATIBLE_VERSIONS') {
                    Ext.cf.util.Logger.error(response.message);
                    throw response.message;
                }
            }
        });
    },

    /** 
     * Send message
     *
     * @param {Object} message
     * @param {Function} callback
     *
     */
    send: function(message, callback) {
        var self = this;

        this._emit('send', message, function(err, status) {
            if(callback) {
                callback(err);
            }

            if(err && status && status === 403) {
                self.fireEvent('forbidden', err);
            }
        });
    },

    /** 
     * Subscribe
     *
     * @param {Object} message
     * @param {Function} callback
     *
     */
    subscribe: function(message, callback) {
        this._emit('subscribe', message, function(err, status) {
            if(callback) {
                callback(err);
            }
        });
    },

    /** 
     * Unsubscribe
     *
     * @param {Object} message
     * @param {Function} callback
     *
     */
    unsubscribe: function(message, callback) {
     this._emit('unsubscribe', message, function(err, status) {
        if(callback) {
            callback(err);
        }
     });
    },

    /** 
     * Emit
     *
     * @param {Object} channel
     * @param {Object} message
     * @param {Function} callback
     *
     */
    _emit: function(channel, message, callback) {
        if(this.socket){
            this.socket.emit(channel, message, callback);
        }
    },

    /** 
     * Receive
     *
     * @param {Object} data
     *
     */
    _receive: function(data){
        if(data.envelope) {
            this.fireEvent('receive', data.envelope);
        } else if(data.envelopes && data.envelopes.length > 0) {
             var l = data.envelopes.length;
            for(var i =0; i < l; i++ ) {
                this.fireEvent('receive', data.envelopes[i]);
            }
        }
    }
});

