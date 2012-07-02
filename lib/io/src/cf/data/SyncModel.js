/**
 * 
 * @private
 *
 * Sync Model
 *
 */
Ext.define('Ext.cf.data.SyncModel', {   
  statics:{
    /**
     * @param {Array} records
     * @return {Boolean}
     */
    areDecorated: function(records) {
        return Ext.Array.every(records,function(record){
            return (record.eco!==undefined && record.eco!==null);
        });
    },

    /**
     * Test if a record has been deleted (check for is deleted)
     *
     * @param {Object} record
     * @return {Boolean}
     */
    isDestroyed: function(r) { // test if a record has been deleted
        var t= (r||this).data._ts;
        return (t!==null && t!==undefined && t!=='');
    },

    /**
     * Test if a record has been deleted (check for is not deleted)
     *
     * @param {Object} record
     * @return {Boolean}
     *
     */
    isNotDestroyed: function(r) { // test if a record has been deleted
        var t= (r||this).data._ts;
        return (t===null || t===undefined || t==='');
    }
  }
});

