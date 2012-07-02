/**
 * @private
 * Instances of {@link Ext.io.Service} represent proxy object to async message based services running in the backend.
 * You can use the proxy to send async messages to the service, to receive async messages from the service,
 * and if the service is a PubSub type of service, to subscribe/unsubscribe to updates from the service.
 *
 * For example:
 *
 *     Ext.io.getService("weather", function(weatherService) {
 *         weatherService.send({temperature: temperature}, function() {
 *             display("Weather Sensor: sent temperature update " + temperature);
 *         }, this);
 *     });
 *
 *
 *     Ext.io.getService("weather", function(weatherService) {
 *         weatherService.subscribe(function(service, msg) {
 *             display(service + " got temperature update: " + msg.temperature);
 *         }, this, function(err) {
 *             console.log("Error during subscribe!");
 *         });
 *     });
 *
 */
Ext.define('Ext.io.Service', {

    config: {
        /**
         * @cfg name
         * @accessor
         */
        name: null,

        /**
         * @cfg descriptor
         * @accessor
         * @private
         */
        descriptor: null,

        /**
         * @cfg transport
         * @accessor
         * @private
         */
        transport: null,
    },

    /**
     * @private
     *
     * Constructor
     *
     */
    constructor: function(config) {
        this.initConfig(config);
        return this;
    },

    /**
     * Send an async message to the service
     *
     * @param {Object} options An object which may contain the following properties:
     *
     * @param {Object} options.message A simple Javascript object.
     *
     * @param {Function} callback The function to be called after sending the message to the server for delivery.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    send: function(options,callback,scope) {
        this.getTransport().sendToService(this.getName(), options.message, callback, scope);
    },

    /**
     * Receive async messages from the service
     *
     * For PubSub type of services, which need subscription to start getting messages, see the 'subscribe' method.
     *
     * @param {Function} callback The function to be called after receiving a message from this service.
     * @param {String} callback.from the service the message originated from, i.e. the name of this service.
     * @param {Object} callback.message A simple Javascript object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    receive: function(callback,scope) {
        this.getTransport().setListener(this.getName(), function(envelope) {
            callback.call(scope,envelope.from,envelope.msg);
        }, this);
    },

    /**
     * Subscribe to receive messages from this service.
     *
     * This method must be used only for PubSub type of services.
     * Some services do not need subscription for delivering messages. Use 'receive' to get messages
     * from such services.
     *
     * @param {Function} callback The function to be called after receiving a message from this service.
     * @param {String} callback.from the service the message originated from, i.e. the name of this service.
     * @param {Object} callback.message A simple Javascript object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    subscribe: function(callaback,scope) {
        var self = this;
        self.transport.subscribe(self.getName(), function(err) {
            if(err) {
                callback.call(scope,err);
            } else {
                self.transport.setListener(self.getName(), function(envelope) {
                    callback.call(scope,envelope.service,envelope.msg);
                }, self);
            }
        }, self);
    },

    /**
     * Unsubscribe from receiving messages from this service.
     *
     * This method must be used only for PubSub type of services.
     */
    unsubscribe: function() {
        this.transport.unsubscribe(this.getName(), callback, scope);
    }
});
