/**
 * @private
 *
 * An Object that can have a picture.
 * 
 */
Ext.define('Ext.io.WithPicture', {

    /** 
     *
     * Upload Picture
     *
     * @param {Object} options
     * 
     * @param {Function} callback
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     */
    uploadPicture: function(options,callback,scope) {
        if (typeof options.file != "undefined") {
            options.file.ftype = 'icon';
            Ext.io.Io.getMessagingProxy(function(messaging){
                messaging.sendContent(
                    options.file,
                    function(csId,err) {
                        if(csId){
                            var tmp = options.file.name.split('.');
                            var ext = "."+tmp[tmp.length - 1];
                            this.setPicture(csId, ext, function(fileName, err) {
                                callback.call(scope,fileName,err);
                            }, this);
                        }else{
                            callback.call(scope,undefined,err);
                        }
                    },
                    this
                );
            },this);
        } else {
            var err = { code : 'FILE_PARAMS_MISSED', message : 'File parameters are missed' };
            callback.call(scope,undefined,err);
        }
    },

    /** 
     *
     * Set Picture
     *
     * @param {String} csKey
     * @param {String} ext
     *
     * @param {Function} callback
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     * 
     */
    setPicture: function(csKey, ext, callback, scope) {
        this.getServiceName(function(err, name) {
            if (!err) {
                Ext.io.Io.getMessagingProxy(function(messaging){
                    messaging.getService(
                        {name: name},
                        function(managerService,err) {
                            if(managerService){
                                managerService.setPicture(function(result) {
                                    if(result.status == "success") {
                                        callback.call(scope, result.value);
                                    } else {
                                        callback.call(scope, undefined, result.error);
                                    }
                                }, this.$className, this.getId(), csKey, ext);
                            }else{
                                callback.call(scope, undefined, err);
                            }
                        },
                        this
                    );
                },this);
            } else {
                callback.call(scope, undefined, err);
            }
        },this);
    },

    /** 
     *
     * Remove Picture
     *
     * @param {Function} callback
     *
     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
     * the callback function.
     */
    removePicture: function(callback,scope) {
        this.getServiceName(function(err, name) {
            if (!err) {
                Ext.io.Io.getMessagingProxy(function(messaging){
                    messaging.getService(
                        {name: name},
                        function(managerService,err) {
                            if(managerService){
                                managerService.removePicture(function(result) {
                                    if(result.status == "success") {
                                        callback.call(scope)
                                    } else {
                                        callback.call(scope,result.error);
                                    }
                                }, this.$className, this.getId());
                            }else{
                                callback.call(scope,err);
                            }
                        },
                        this
                    );
                },this);
            } else {
                callback.call(scope,err);
            }
        },this);
    },

    /** 
     * @private
     *
     * @param {Function} callback
     *
     */
    getServiceName: function(callback,scope) {
        var name;
        switch(this.$className) {
            case 'Ext.io.App':
                name = 'AppService';
                break;
            case 'Ext.io.Team':
                name = 'TeamService';
                break;
        }
        if (name) {
            callback.call(scope,null, name);
        } else {
            callback.call(scope,{code:'NOT_SUPPORTED', message:'This class of object does not support picture operations'}, null);
        }
    }

});

