/**
 *
 *  @aside guide concepts_channel 
 *
 * This class allows the client to make use of message channels.
 *
 *  {@img channel1.png Subscribe}
 * 
 * A channel accepts messages which
 * are published to it and distributes a copy of the message to all of the registered
 * subscribers. Using this mechanism a client can send messages to other clients, with
 * the benefit that messages for offline clients will be stored on the Sencha.io
 * servers until they can be delivered.
 *
 *       Ext.io.Channel.get(
 *           { name: 'rendezvous' },
 *           function(channel){
 *           
 *           }
 *       );
 *
 * ## Publish
 *
 * A message, which is a simple Javascript object, can be sent to a channel using the
 * `publish` method. If the device is offline then the message is stored locally, and
 * sent when the device next comes online. The message can be any plain old javascript object.
 *
 *           channel.publish(
 *               { message: {
 *                   score: 182
 *               }},
 *               function() {
 *          
 *               }   
 *           );
 *
 * {@img channel2.png Publish}
 *
 * ## Subscribe
 *
 * To receive messages the client must subscribe to the channel. The device must be 
 * online when the call to subscribe is made in order for the client to register
 * its interest in the channel. Subsequently if the device goes offline then any
 * messages will be queued on the server for delivery when the device comes back
 * online.
 *
 * {@img channel3.png Subscribe}
 *
 * Channel object uses  {Ext.mixin.Observable} to publish new message events.  
 * After calling  `Ext.io.Channel.get` the channel object will be subscribed to receive channel messages. 
 * You can then listen to those events:
 *
 *           channel.on("message", function(sender, message){
 *               console.log("channel message", sender, message);
 *           }, this);
 *
 * ## Many Subscribers
 *
 * A channel can have multiple subscribers, and messages sent to the channel are delivered to each subscriber.
 * Messages published by a device are not sent back to the same device (i.e. echo is prevented)
 *
 * {@img channel4.png Many Subscribers}
 *
 * ## Unsubscribe
 *
 * Once a channel has been subscribed to, messages will be delivered until a subsequent
 * call to the unsubscribe method is made.
 *
 */
Ext.define('Ext.io.Channel', {
    extend: 'Ext.io.Object',
    
    mixins: {
        observable: "Ext.util.Observable" //using util instead of mixin for EXT 4 compatibility. 
    },
    
    /**
    * @event message
    * Fired when the channel receives a message.
    * @param {Ext.io.Sender} sender The user/device that sent the message
    * @param {Object} the message sent.
    */

    statics: {

        /**
         * @static
         * Get a named channel
         *
         * All instances of an app have access to the same
         * named channels. If an app gets the same named channel on many devices then
         * those devices can communicate by sending messages to each other. Messages 
         * are simple javascript objects, which are sent by publishing them through 
         * a channel, and are received by other devices that have subscribed to the 
         * same channel.
         *
         *          Ext.io.Channel.get(
         *               { name: 'music' },
         *               function(channel){
         *               }
         *           );     
         *
         * @param {Object} options Channel options may contain custom metadata in addition to the name, which is manadatory
         * @param {String} options.name Name of the channel
         *
         * @param {Function} callback The function to be called after getting the channel.
         * @param {Object} callback.channel The named {Ext.io.Channel} if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         *
         */
        get: function(options,callback,scope) {
            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
               { name: "name", type: 'string' },
            ],arguments, "Ext.io.Channel", "get")) { 
                Ext.io.Io.getMessagingProxy(function(messaging){
                    options.appId = Ext.io.Io.getIdStore().getId('app');
                    messaging.getChannel(options,callback,scope);
                },this);
            }
        },

        /**
         * @static
         * @private
         *
         * Find channels that match a query.
         * 
         * Returns all the channel objects that match the given query. The query is a String
         * of the form name:value. For example, "city:austin", would search for all the
         * channels with a meta data key of city and  value of Austin. 
         * Find uses the metadata supplied when the channel was created. 
         * 
         * 
         *       Ext.io.Channel.find(
         *           { query: 'city:austin' },
         *           function(channels){
         *           }
         *       );
         *
         * @param {Object} options An object which may contain the following properties:
         * @param {Object} options.query
         *
         * @param {Function} callback The function to be called after finding the matching channels.
         * @param {Array} callback.channels An array of  {Ext.io.Channel} objects matching channels found for the App if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         *
         */
        find: function(options,callback,scope) {
            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
               { name: "query", type: 'string' },
            ],arguments, "Ext.io.Channel", "find")) {
                Ext.io.App.getCurrent(function(app,err){
                  if(app){
                      app.findChannels(options,callback,scope);
                  }else{
                      callback.call(scope,app,err);
                  }
                });
            }
        },
    },

    config: {
        name: undefined,
        queueName: undefined,
        
        /**
        * @cfg {Boolean} subscribeOnStart
        * Channel will automatically subscribe 
        * to channel messages when the channel is created. 
        * @accessor
        */
        subscribeOnStart: true
    },
    
    /**
     * @private
     *
     * @param {Object} config
     */
    constructor: function(config) {
        this.initConfig(config);
        if(this.getSubscribeOnStart()){
            this.subscribe();
        }
    },

    /**
     * Publish a message to this channel.
     *
     * The message will be delivered to all devices subscribed to the channel.
     *
     *      channel.publish(
     *             { message: { 
     *                 score: 182
     *             }},
     *             function(error) {
     *          
     *             }   
     *       );
     *     
     * @param {Object} options
     * @param {Object} options.message A simple Javascript object.
     *
     * @param {Function} callback The function to be called after sending the message to the server for delivery.
     * @param {Object} callback.err an error object. Will be null/undefined if there wasn't an error.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    publish: function(options,callback,scope) {
        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
           { name: "message", type: 'object|string' },
        ],arguments, "Ext.io.Channel", "publish")) {
            Ext.io.Io.getMessagingProxy(function(messaging){
                messaging.pubsub.publish(this.getQueueName(), this.getId(), options.message, callback, scope);
            },this);
        }
    },

    /**
     * @private
     * This method is called automatically on startup. Use the message event instead.
     *
     * Subscribe to receive messages from this channel.
     *
     * To receive messages from a channel, it is necessary to subscribe to the channel.
     * Subscribing registers interest in the channel and starts delivery of messages
     * published to the channel using the callback.
     *
     *
     *       Ext.io.Channel.get(
     *         { name: "table-123" },
     *         function(channel) {
     *           channel.subscribe(
     *             function(sender, message) {
     *             }
     *           );
     *         }
     *       );
     *
     * @param {Function} callback The function to be called after subscribing to this Channel.
     * @param {String} callback.from The sending Device ID.
     * @param {Object} callback.message A simple Javascript object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     */
    subscribe: function(callback,scope) {
        if(!this.subscribedFn){
            this.subscribedFn = function subscribeCallback(sender, message) {
                var sender = Ext.create('Ext.io.Sender', sender);
                this.fireEvent("message", sender, message);
            };
            Ext.io.Io.getMessagingProxy(function(messaging){
                messaging.pubsub.subscribe(this.getQueueName(), this.getId(), this.subscribedFn, this, Ext.emptyFn);
            },this);
        } 
        if(callback) {
            this.on("message", callback, scope);
        }
        
    },

    /**
     * Unsubscribe from receiving messages from this channel.
     *
     * Once a channel has been subscribed to, message delivery will continue until a call to unsubscribe is made.
     * If a device is offline but subscribed, messages sent to the channel will accumulate on the server,
     * to be delivered after the device reconnects at a later point of time.
     *
     * @param {Function} callback The function to be called after unsubscribing from this Channel.
     * @param {Object} callback.err an error object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    unsubscribe: function(callback,scope) {
        if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Channel", "unsubscribe")) {
            Ext.io.Io.getMessagingProxy(function(messaging){
                messaging.pubsub.unsubscribe(this.getQueueName(), this.getId(), callback, scope);
            },this);
        }
    },
    
});
