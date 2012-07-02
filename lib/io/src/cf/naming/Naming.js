/**
 * @private
 *
 */
Ext.define('Ext.cf.naming.Naming', {
    
    alternateClassName: 'Ext.io.Naming',

    /**
     * Get service descriptor
     *
     * @param {String} serviceName
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    getServiceDescriptor: function(serviceName, callback, scope) {
        if(serviceName == "naming-rpc") {
            callback.call(scope, {
                kind: "rpc",
                style: ["subscriber"],
                access: ["clients", "servers"],
                depends: ["messaging", "naming"],
                methods: [
                    "getServiceDescriptor",
                    "get", 
                    "find",
                    "update",
                    "add",
                    "destroy",
                    "getRelatedObject", 
                    "getRelatedObjects", 
                    "findRelatedObjects",
                    "getStore",
                    "createRelatedObject",
                    "setPicture",
                    "dropPicture"
                ]
            });
        } else {
            Ext.io.Io.getMessagingProxy(function(messaging){
                messaging.getService(
                    {name: "naming-rpc"},
                    function(namingRpc,err) {
                        if(namingRpc){
                            namingRpc.getServiceDescriptor(function(result) {
                                if(result.status == "success") {
                                    callback.call(scope, result.value);
                                } else {
                                    callback.call(scope, undefined, result.error);
                                }
                            }, serviceName);
                        }else{
                            callback.call(scope, undefined, err);
                        }
                    },this
                );
            },this);
        }
    }
});

