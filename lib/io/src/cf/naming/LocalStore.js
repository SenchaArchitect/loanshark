/**
 * @private
 *
 */
Ext.define('Ext.cf.naming.LocalStore', {
    /**
    * Get item
    *
    * @param {String/Number} key
    *
    */
    getItem: function(key) {
        var store= window.localStorage;
        if (store) {
            var value = store.getItem(key);
            if(value === "null") {
                return null;
            } else if(value === "undefined") {
                return undefined;
            } else {
                return value;
            }
        }
    },

    /**
    * Set item
    *
    * @param {String/Number} key
    * @param {String/Number} value
    *
    */
    setItem: function(key,value) {
        var store= window.localStorage;
        if (store) {
            store.setItem(key,value);
        }
    },

    /**
    * Remove item
    *
    * @param {String/Number} key
    *
    */
    removeItem: function(key) {
        var store= window.localStorage;
        if (store) {
            store.removeItem(key);
        }
    }
});
