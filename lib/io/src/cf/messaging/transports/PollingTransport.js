/**
 * @private
 *
 * Polling Transport
 *
 */
Ext.define('Ext.cf.messaging.transports.PollingTransport', {
    requires: ['Ext.cf.util.Logger', 'Ext.cf.util.ErrorHelper'],

    mixins: {
        observable: "Ext.util.Observable"
    },

    intervalId: null,

    config: {
        url: 'http://msg.sencha.io',
        deviceId: null,
        deviceSid: null,
        piggybacking: true,
        maxEnvelopesPerReceive: 10,
        pollingDuration: 5000
    },

    /** 
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        this.initConfig(config);
        this.mixins.observable.constructor.call(this);

        return this;
    },

    /** 
     * Get receive Invoker
     *
     */
    getReceiveInvoker: function() {
        var self = this;

        var callback = function(err, response) {
            self.responseHandler(err, response);
        };

        var params = { deviceId: self.config.deviceId, max: self.config.maxEnvelopesPerReceive} ;
        
        if(self.config.deviceSid) {
            params.deviceSid = self.config.deviceSid;
        }

        self.ajaxRequest("/receive", params, {}, callback);
    },

    /** 
     * Start
     *
     */
    start: function() {
        var self = this;
        this.intervalId = setInterval(function() { self.getReceiveInvoker();} , this.config.pollingDuration);

        this.checkVersion();    
    },

    /** 
     * Check version
     *
     */
    checkVersion: function() {
        this.ajaxRequest("/version", { }, { v: Ext.getVersion("sio").toString() }, function(err, response) {
            Ext.cf.util.Logger.debug("checkVersion", err, response);
            if(err) {
                Ext.cf.util.Logger.error("Error performing client/server compatibility check", err);
            } else {
                try {
                    response = Ext.decode(response.responseText);
                    if(response && response.code === 'INCOMPATIBLE_VERSIONS') {
                        Ext.cf.util.Logger.error(response.message);
                        throw response.message;
                    }
                } catch(e) {
                    Ext.cf.util.Logger.error("Error decoding version response", response.responseText);
                }
            }
        });
    },

    /** 
     * Stop
     *
     */
    stop: function() {
        clearInterval(this.intervalId);
    },

    /** 
     * Response handler
     *
     * @param {Object} err
     * @param {Object} response
     *
     */
    responseHandler: function(err, response) {
        var self = this;

        if(!err) {
            Ext.cf.util.Logger.debug("PollingTransport",this.config.url,"response:",response.responseText);
            var data = Ext.decode(response.responseText);

            if(data) {
                var envelopes = data.envelopes;
                var hasMore = data.hasMore;

                if(hasMore) { // if there are more messages, make another RECEIVE call immediately
                    setTimeout(function() { self.getReceiveInvoker();}, 0);
                }

                if(envelopes) {
                    for(var i = 0; i < envelopes.length; i++) {
                         this.fireEvent('receive', envelopes[i]);
                    }
                } else {
                    Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"envelopes missing in response",response.status); 
                }
            } else {
                Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"response text is null",response.status);  
            }
        } else {
            Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"response error:",response);
        }
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

        this.ajaxRequest("/send", { max: this.config.maxEnvelopesPerReceive }, message, function(err, response, doBuffering) {
            callback(err, doBuffering);

            if(self.config.piggybacking) {
                self.responseHandler(err, response);
            }

            if(err && response && response.status === 403) {
                self.fireEvent('forbidden', err);
            }
        });
    },

    /** 
     * Subscribe
     *
     * @param {Object} params
     * @param {Function} callback
     *
     */
    subscribe: function(params, callback) {
        var self = this;

        if(self.config.deviceSid) {
            params.deviceSid = self.config.deviceSid;
        }

        this.ajaxRequest("/subscribe", params, {}, callback);
    },

    /** 
     * Unsubscribe
     *
     * @param {Object} params
     * @param {Function} callback
     *
     */
    unsubscribe: function(params, callback) {
        var self = this;

        if(self.config.deviceSid) {
            params.deviceSid = self.config.deviceSid;
        }

        this.ajaxRequest("/unsubscribe", params, {}, callback);
    },

    /** 
     * AJAX Request
     *
     * @param {String} path
     * @param {Object} params
     * @param {Object} jsonData
     * @param {Function} callback
     *
     */
    ajaxRequest: function(path, params, jsonData, callbackFunction) {
        if(!this.config.piggybacking) {
            params.pg = 0; // client has turned off piggybacking
        }

        Ext.Ajax.request({
            method: "POST",
            url: this.config.url + path,
            params: params,
            jsonData: jsonData,
            scope: this,

            callback: function(options, success, response) {
                if(callbackFunction) {
                    if(response && response.status === 0) { // status 0 = server down / network error
                        callbackFunction(Ext.cf.util.ErrorHelper.get('NETWORK_ERROR'), null, true); // request can be buffered
                    } else {
                        if(success) {
                            callbackFunction(null, response);
                        } else {
                            var err = Ext.cf.util.ErrorHelper.decode(response.responseText);
                            callbackFunction(err, response, false); // no buffering, server replied
                        }
                    }
                }
            }
        });
    }
});

