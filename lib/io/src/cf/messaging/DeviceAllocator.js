/**
 * @private
 *
 * Registers or Authenticates a device with the Sencha.io servers.
 *
 */
Ext.define('Ext.cf.messaging.DeviceAllocator', {
    
    requires: ['Ext.cf.util.Logger', 'Ext.cf.util.ErrorHelper'],

    statics: {
        /** 
         * Register
         *
         * @param {String} url
         * @param {String/Number} appId
         * @param {Function} callback
         *
         */      
        register: function(url, appId, callback) {
            this.callServer(url, "/device/register", {appId: appId}, callback);
        },

        /** 
         * Authenticate
         *
         * @param {String} url
         * @param {String/Number} deviceSid
         * @param {String/Number} deviceId
         * @param {Function} callback
         *
         */      
        authenticate: function(url, deviceSid, deviceId, callback) {
            this.callServer(url, "/device/authenticate", {deviceSid: deviceSid, deviceId: deviceId}, callback);
        },

        /** 
         * Call server
         *
         * @param {String} url
         * @param {String} api
         * @param {Object} data
         * @param {Function} callback
         *
         */      
        callServer: function(url, api, data, callback) {
            Ext.Ajax.request({
                method: "POST",
                url: url + api,
                params: {},
                jsonData: data,
                scope: this,
                callback: function(options, success, response) {
                    if(response && response.status === 0) {
                        // network is down
                        callback({status:'error', error: Ext.cf.util.ErrorHelper.get('NETWORK_ERROR') });
                    } else {
                        if(success) {
                            callback(Ext.decode(response.responseText));
                        } else {
                            callback({status:'error', error: {code: 'API_ERROR', message:'Error during API call' + api + ' Status ' + response.status }});
                        }
                    }
                }
            });            
        }
    }
});
