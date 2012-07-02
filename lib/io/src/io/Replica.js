/**
 * @private
 *
 */
Ext.define('Ext.io.Replica', {
    extend: 'Ext.io.Object',
        
    statics: {

        /** 
         * @static
         * 
	     * @param {Object} options
	     *  
	     * @param {Function} callback The function to be called after getting replica.
	     * @param {Object} error object
	     *
	     * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
	     * the callback function.
         */
        get: function(options,callback,scope) {
            replicas.getObject(options.id, callback, scope);
        }
    },

});

