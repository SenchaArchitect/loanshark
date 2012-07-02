/**
 * 
 * @aside guide concepts_device
 *
 * The Ext.io.Device class represents an instance of an application running on a physical device. 
 * It has a zero-or-one relationship with the Ext.io.User class 
 * A full description of the Ext.io.Device class can be found in the [Device Concept Guide](#!/guide/concepts_device).
 *
 * {@img device1.png Class Diagram}
 *
 * ## Device Object
 *
 * There is always a device object available for the current device.
 *
 *          Ext.io.Device.getCurrent({
 *              function(device){
 *              
 *              } 
 *          });
 *
 * Device Objects are also used to represent other devices running the same app.
 * These can be instantiating using Ext.io.Device.get.
 *
 * ## Device Channel
 *
 * All devices have an associated channel for receiving messages. A message, which
 * is a plain old javascript object, can be sent to another device using the 
 * Ext.io.Device.send method.
 *
 *          device.send({
 *              from: 'John', text: 'Hey!'
 *          });
 *
 * A device can listen for mesasges from other devices with the `on` method.
 *
 *          Ext.io.Device.getCurrent({
 *             function(device){
 *
 *                device.on("message"
 *                    function(sender, message) {
 *                        console.log("device message", sender, message);
 *                    }
 *                );
 *
 *             } 
 *          });
 *
 * Device to device messages are always from a single device and to a single device. 
 *
 * To send a message to all devices running the same app the client would use
 * Ext.io.Channel 
 *
 * To send a message to all devices of a particular user the client would use
 * Ext.io.User.send.
 *
 */
Ext.define('Ext.io.Device', {
    extend: 'Ext.io.Object',
    
    mixins: {
        observable: "Ext.util.Observable" //using util instead of mixin for EXT 4 compatibility. 
    },

    /**
    * @event message
    * Fired when the device receives a message.
    * @param {Ext.io.Sender} sender The device that sent the message
    * @param {Object} message The message received.
    */

    statics: {

        /**
         * @static
         * @private
         * Find devices that match a query.
         * 
         * Returns all the device objects that match the given query. The query is a String
         * of the form name:value. For example, "city:austin", would search for all the
         * devices in Austin, assuming that the app is adding that attribute to all
         * its devices.
         * 
         *       user.find(
         *           {query:'city:austin'},
         *           function(devices){
         *           }
         *       );
         *
         * @param {Object} options An object which may contain the following properties:
         * @param {Object} options.query
         *
         * @param {Function} callback The function to be called after finding the matching devices.
         * @param {Array} callback.devices An array of type Ext.io.Device matching devices found for the App if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         *
         */
        find: function(options,callback,scope) {
          if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
               { name: "query", type: 'string' },
            ],arguments, "Ext.io.Device", "find")) {
            Ext.io.App.getCurrent(function(app,err){
                if(app){
                    app.findDevices(options,callback,scope);
                }else{
                    callback.call(scope,app,err);
                }
            });
          }
        },

        /**
         * @static
         * Get the current Device object.
         *
         *          Ext.io.Device.getCurrent(
         *              function(device){
         *              } 
         *          );
         *
         * The current Device object is an instance of Ext.io.Device class. It represents
         * the device that this web app is running on. It is always available.
         *
         * The device object returned by this method will fire message events whenever a message is set from the the server.
         *
         * @param {Function} callback The function to be called after getting the current Device object.
         * @param {Object} callback.device The current Ext.io.Device object if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         *
         */
        getCurrent: function(callback,scope) {
            if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Device", "getCurrent")) {
                var deviceId = Ext.io.Io.getIdStore().getId('device');
                if (!deviceId) {
                    var err = { code : 'NO_DEVICE_ID', message: 'Device ID not found' };
                    callback.call(scope,undefined,err);
                } else {
                    var cb = function(device,errors){
                        if(device && device.receive) {
                            device.receive();
                        }
                        callback.call(scope, device, errors);
                    }
                    this.getObject(deviceId, cb, this);
                }
            }
        },

        /**
         * @static
         * Get Device
         *
         * @param {Object} options
         * @param {Object} options.id
         *
         * @param {Function} callback The function to be called after getting the Device object.
         * @param {Object} callback.device The Ext.io.Device object if the call succeeded.
         * @param {Object} callback.err an error object.
         *
         * @param {Object} scope The scope in which to execute the callback. The "this" object for
         * the callback function.
         */
        get: function(options,callback,scope) {
          if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
               { name: "id", type: 'string|number' },
            ],arguments, "Ext.io.Device", "get")) {
              this.getObject(options.id, callback, scope);
            }
        }
    },

    /**
     * @private
     * Get the App associated with this Device.
     *
     *          device.getApp(
     *              function(app){
     *              } 
     *          );
     *
     * @param {Function} callback The function to be called after getting the App object.
     * @param {Object} callback.app The Ext.io.App associated with this Device if the call succeeded.
     * @param {Object} callback.err an error object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    getApp: function(callback,scope) {
        this.getRelatedObject(Ext.io.Version, this.getData().version, null, function(version, err) {
            if(err) {
                callback.call(scope,undefined,err);
            } else {
                version.getRelatedObject(Ext.io.App, null, null, callback, scope);
            }
        }, this);
    },

    /**
     * Get the User associated with this Device, if any.
     *
     *          device.getUser(
     *              function(user){
     *              } 
     *          );
     *
     *
     * @param {Function} callback The function to be called after getting the User object.
     * @param {Object} callback.user The Ext.io.User associated with this Device if the call succeeded.
     * @param {Object} callback.err an error object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    getUser: function(callback,scope) {
        if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Device", "getUser")) {
            this.getRelatedObject(Ext.io.User, null, null, callback, scope);
        }
    },

    /**
     * Send a message to this Device.
     *
     * The send method allow messages to be sent to another device. The message
     * is a simple Javascript object. The message is channeld on the server until
     * the destination device next comes online, then it is delivered.
     *
     *        device.send({
     *            message: {city: 'New York', state: 'NY'},
     *        }, function(error){
     *            console.log("send callback", error);
     *        });
     *
     * See message event for receiving device to device messages.
     *
     *
     * @param {Object} options
     * @param {Object} options.message A simple Javascript object.
     *
     * @param {Function} callback The function to be called after sending the message to the server for delivery.
     * @param {Object} callback.error an error object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    send: function(options,callback,scope) {
        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{ name: "message", type: 'string|object' }],arguments, "Ext.io.Device", "send")) {
            Ext.io.Io.getMessagingProxy(function(messaging){
                messaging.transport.sendToClient(this.getId(), options.message, callback, scope);
            },this);
        }
    },

    /**
     * @private
     * 
     * This method is called by Ext.io.Device.getCurrent before the device
     * object is returned.  It should not be called directly. 
     * 
     * Receive messages for this Device.
     *
     * To receive messages sent directly to a device the app must use this
     * method to register a handler function. Each message is passed to the
     * callback function as it is received. The message is a simple Javascript
     * object.
     *
     *      device.receive(
     *          function(sender, message) {
     *              console.log("received a message:", sender, message);
     *          }
     *      );
     *
     * See send for sending these device to device messages.
     *
     * @param {Function} callback Optional function to be called after receiving a message for this Device.
     * @param {String} callback.from The sending Device ID.
     * @param {Object} callback.message A simple Javascript object.
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     *
     */
    receive: function(callback,scope) {
        if(callback) {
            this.on("message", callback, scope);
        }
        if(!this.subscribedFn){
            this.subscribedFn = function(envelope) {
                var sender = Ext.create('Ext.io.Sender', envelope.from);
                this.fireEvent("message", sender, envelope.msg);
            };
            Ext.io.Io.getMessagingProxy(function(messaging){
                messaging.transport.setListener("courier", this.subscribedFn, this);
            },this);
        } 
    },

    /**
     * @private
     *
     * Get Version
     *
     * @param {Function} callback The function to be called after getting the version.
     * @param {Object} callback.version 
     * @param {Object} callback.err an error object.
     *
     * @param {Object} scope The scope in which to execute the callback. The "this" object for
     * the callback function.
     */
    getVersion: function(callback,scope) {
        this.getRelatedObject(Ext.io.Version, this.getData().version, null, callback, scope);
    },

});
