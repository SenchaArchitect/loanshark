Ext.define('Payback.model.Person', {
    extend: 'Ext.data.Model',

    uses: [
        'Payback.model.Debt'
    ],

    config: {
        identifier: {
            type: 'uuid'
        },
        proxy: {
            type: 'syncstorage',
            owner: 'user',
            access: 'private',
            id: 'Person'
            
        },
        hasMany: {
            associationKey: 'person_id',
            model: 'Payback.model.Debt',
            autoLoad: true,
            foreignKey: 'person_id',
            name: 'debts',
            store: {
                remoteFilter: false,
                modelDefaults: null
            }
        },
        fields: [
            {
                name: 'id',
                type: 'auto'
            },
            {
                name: 'name'
            },
            {
                name: 'phone'
            },
            {
                name: 'email'
            },
            {
                defaultValue: 0,
                name: 'balance',
                type: 'float'
            }
        ]
    },

    calcBalance: function() {
        return this.set('balance', this.debts().sum('balance'));
    }

});