/**
 * @private
 *
 */
Ext.define('Ext.cf.Utilities', {
    requires: ['Ext.cf.util.Logger'],

    statics: {

        /**
         * Delegate
         *
         * @param {Object} from_instance
         * @param {Object} to_instance
         * @param {Array} methods
         *
         */
        delegate: function(from_instance, to_instance, methods) {
            if (to_instance===undefined) { 
                var message= "Error - Tried to delegate '"+methods+"' to undefined instance.";
                Ext.cf.util.Logger.error(message);
                throw message;
            }
            methods.forEach(function(method){
                var to_method= to_instance[method];
                if (to_method===undefined) { 
                    message= "Error - Tried to delegate undefined method '"+method+"' to "+to_instance;
                    Ext.cf.util.Logger.error(message);
                    throw message;
                }
                from_instance[method]= function() {
                    return to_method.apply(to_instance, arguments);
                };
            });
        },

        /**
         * Check
         *
         * @param {String} class_name for reporting
         * @param {String} method_name for reporting
         * @param {String} instance_name for reporting
         * @param {Object} instance of the object we are checking
         * @param {Array} properties that we expect to find on the instance 
         *
         */
        check: function(class_name, method_name, instance_name, instance, properties) {
            if (instance===undefined) {
                var message= "Error - "+class_name+"."+method_name+" - "+instance_name+" not provided.";
                Ext.cf.util.Logger.error(message);
            } else {
                properties.forEach(function(property) {
                    var value= instance[property];
                    if (value===undefined) {
                        var message= "Error - "+class_name+"."+method_name+" - "+instance_name+"."+property+" not provided.";
                        Ext.cf.util.Logger.error(message);
                    }
                });
            }
        },

        /**
         *
         * Wrap a Method
         *
         * @param {Function} m The method to wrap.
         * @param {String} key A flag so that we know when the method has already been wrapped.
         * @param {Function} before The function to call before the method.
         * @param {Function} after The function to call after the method.
         */
        wrapMethod: function(m,key,before,after){
            if(m[key]){
                return m;
            }else{
                var nm= function(){
                    if(before) { before.call(this,m,arguments); };
                    m.apply(this,arguments);
                    if(after) { after.call(this,m,arguments); };
                };
                nm[key]= true;
                nm.displayName= m.displayName;
                return nm;
            }
        },

        /**
         *
         * Wrap all the Methods of a Class
         *
         * @param {Object} klass 
         * @param {String} key
         * @param {Function} f
         * @param {Function} before The function to call before the method.
         * @param {Function} after The function to call after the method.
         */
        wrapClass: function(klass,key,before,after) {
            for (var name in klass) {
                if (klass.hasOwnProperty(name)) {
                    var m= klass[name];
                    if(m.displayName){ // limit the wrapping to sencha style methods... JCM probably there's a better way. 
                        klass[name]= this.wrapMethod(m,key,before,after);
                    }
                }
            }
        }

    }

});

