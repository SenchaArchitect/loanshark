/*
* @private
*/
Ext.define('Ext.cf.util.UuidGenerator', {

    statics: {
        /**
         * @private
         *
         * Generate
         *
         * @return {String} UUID
         *
         */
        generate: function() { // totally random uuid
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }
    }
    
});