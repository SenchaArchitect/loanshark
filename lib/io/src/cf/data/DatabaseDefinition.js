/**
 * 
 * @private
 *
 * Database Definition
 *
 */
Ext.define('Ext.cf.data.DatabaseDefinition', {
    extend: 'Object',
    requires: ['Ext.cf.Utilities'],

    config: {
        /**
         * @cfg groupId
         * @accessor
         */
        groupId: undefined,
        /**
         * @cfg userId
         * @accessor
         */
        userId: undefined,
        /**
         * @cfg databaseName
         * @accessor
         */
        databaseName: undefined,
        /**
         * @cfg generation
         * @accessor
         */
        generation: undefined, // of the database
        /**
         * @cfg idProperty
         * @accessor
         */
        idProperty: undefined,
        /**
         * @cfg version
         * The version of the client side storage scheme.
         * @accessor
         */
        version: 2
        // JCM include the epoch of the clock here?
    },  
    
    /** 
     * @private
     *
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        Ext.cf.Utilities.check('DatabaseDefinition', 'constructor', 'config', config, ['databaseName','generation']);
        this.initConfig(config);
    },

    /** 
     * hasOwner
     *
     * @return {Boolean} True/False
     *
     */
    hasOwner: function() {
        return this.getUserId()!==undefined || this.getGroupId()!==undefined;
    },

});
