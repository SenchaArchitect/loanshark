/**
 * @private
 *
 * Publish/Subscribe Messaging
 *
 */
Ext.define('Ext.cf.messaging.PubSub', {
    
    config: {
        /**
         * @cfg transport
         * @accessor
         */
        transport: undefined
    },

    /** 
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        this.initConfig(config);
        return this;
    },

    /**
     * @private
     */
    channelCallbackMap: {},

    /** 
     * Handle incoming envelope
     *
     * @param {Object} envelope
     *
     */
    handleIncoming: function(envelope) {
        var channelName = envelope.msg.queue;
        if(channelName && this.channelCallbackMap[channelName]) {
            var item = this.channelCallbackMap[channelName];
            var sender = {
              deviceId: envelope.from,
              userId: envelope.userId
            };
            item.callback.call(item.scope,sender,envelope.msg.data);
        } else {
            Ext.cf.util.Logger.warn("PubSub: No callback for channelName " + channelName);
        }
    },

    /** 
     * Publish
     *
     * @param {String} channelName
     * @param {String} qKey
     * @param {Object} data
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    publish: function(channelName, qKey, data, callback, scope) {
        this.getTransport().send(
            {service:"client-pubsub", msg:{api:"publish", queue:channelName, qKey: qKey, data:data}
        }, callback, scope);
    },

    /** 
     * Subscribe
     *
     * @param {String} channelName
     * @param {String} qKey
     * @param {Function} callback
     * @param {Object} scope
     * @param {Function} errCallback
     *
     */
    subscribe: function(channelName, qKey, callback, scope, errCallback) {
        this.getTransport().setListener("client-pubsub", this.handleIncoming, this);
        this.getTransport().send(
            {service:"client-pubsub", msg:{api:"subscribe", queue:channelName, qKey: qKey}
        }, function(err) {
            if(err) {
                if (errCallback) {
                    errCallback.call(scope, err);
                }
            } else {
                this.channelCallbackMap[channelName] = {callback:callback,scope:scope};
                Ext.cf.util.Logger.info("client-pubsub: " + this.getTransport().getDeviceId() + " subscribed to " + channelName);
            }
        }, this);
    },

    /** 
     * Unsubscribe
     *
     * @param {String} channelName
     * @param {String} qKey
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    unsubscribe: function(channelName, qKey, callback, scope) {
        delete this.channelCallbackMap[channelName];
        this.getTransport().send(
            {service:"client-pubsub", msg:{api:"unsubscribe", queue:channelName, qKey:qKey}
        }, function(err) {
            Ext.cf.util.Logger.info("client-pubsub: " + this.getTransport().getDeviceId() + " unsubscribed to " + channelName);
            if(callback){
                callback.call(scope, err);
            }
        }, this);
    }
});

