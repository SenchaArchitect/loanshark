/**
 * 
 * @private
 *
 * Replica Definition
 *
 */
Ext.define('Ext.cf.data.ReplicaDefinition', { 
    extend: 'Object',
    requires: ['Ext.cf.Utilities'],

    config: {
        /**
         * @cfg deviceId
         * @accessor
         */
        deviceId: undefined,
        /**
         * @cfg replicaNumber
         * @accessor
         */
        replicaNumber: undefined
    },
    
    /** 
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        Ext.cf.Utilities.check('ReplicaDefinition', 'constructor', 'config', config, ['replicaNumber']);
        this.initConfig(config);
    },

    /** 
     * Change replica number
     *
     * @param {Number} replicaNumber
     *
     * return {Boolean} True/False
     *
     */
    changeReplicaNumber: function(replicaNumber) {
        var changed= (this.getReplicaNumber()!=replicaNumber); 
        this.setReplicaNumber(replicaNumber);
        return changed;
    },
        
    /**
     * Return as data
     */
    as_data: function() {
        return {
            deviceId: this.getDeviceId(),
            replicaNumber: this.getReplicaNumber()
        };
    }

});
