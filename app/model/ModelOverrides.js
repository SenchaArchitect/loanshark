//people
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

//payments
Ext.define('Payback.model.Payment', {
    extend: 'Ext.data.Model',

    uses: [
        'Payback.model.Debt'
    ],

    config: {
        identifier: {
            type: 'uuid'
        },
        fields: [
            {
                name: 'id',
                type: 'auto'
            },
            {
                name: 'debt_id'
            },
            {
                name: 'amount',
                type: 'float'
            },
            {
                name: 'date',
                type: 'date'
            },
            {
                name: 'memo',
                type: 'string'
            }
        ],
        proxy: {
            type: 'syncstorage',
            owner: 'user',
            access: 'private',
            id: 'Payments'   
        },
        belongsTo: {
            model: 'Payback.model.Debt',
            foreignKey: 'debt_id'
        }
    }
});

//debts
Ext.define('Payback.model.Debt', {
    extend: 'Ext.data.Model',
    alias: 'model.Debt',

    uses: [
        'Payback.model.Payment',
        'Payback.model.Person'
    ],

    config: {
        identifier: {
            type: 'uuid'
        },
        fields: [
            {
                name: 'id',
                type: 'auto'
            },
            {
                name: 'reason'
            },
            {
                name: 'amount'
            },
            {
                convert: function(v, rec) {
                    var sum = rec.get('amount') - rec.payments().sum('amount');
                    sum = Math.round(sum*100)/100;

                    return sum;
                },
                name: 'balance',
                type: 'float'
            },
            {
                name: 'date',
                type: 'date'
            },
            {
                name: 'person_id'
            }
        ],
        hasMany: {
            model: 'Payback.model.Payment',
            autoLoad: true,
            foreignKey: 'debt_id',
            name: 'payments',
            store: {
                modelDefaults: null,
                remoteFilter: false
            }
        },
        proxy: {
            type: 'syncstorage',
            owner: 'user',
            access: 'private',
            id: 'Debts'   
        },
        belongsTo: {
            model: 'Payback.model.Person',
            foreignKey: 'person_id'
        }
    }
});