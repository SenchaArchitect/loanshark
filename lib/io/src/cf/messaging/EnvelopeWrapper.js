/**
 * @private
 *
 * Wraps an envelope and its contained message in a Model so
 * that it can be stored in a Store.
 *
 */
Ext.require('Ext.cf.Overrides',function(){
    Ext.io_define('Ext.cf.messaging.EnvelopeWrapper', {
        requires: ['Ext.data.identifier.Uuid'],
        extend: 'Ext.data.Model',
        config: { 
            identifier: 'uuid',
            fields: [
                {name: 'e', type: 'auto'}, // envelope
                {name: 'ts', type: 'integer'} // timestamp
            ]
        }
    });
});
