/*
 * File: app/view/myDebtListItem.js
 *
 * This file was generated by Sencha Architect version 2.0.0.
 * http://www.sencha.com/products/architect/
 *
 * This file requires use of the Sencha Touch 2.0.x library, under independent license.
 * License of Sencha Architect does not include license for Sencha Touch 2.0.x. For more
 * details see http://www.sencha.com/license or contact license@sencha.com.
 *
 * This file will be auto-generated each and everytime you save your project.
 *
 * Do NOT hand edit this file.
 */

Ext.define('Payback.view.myDebtListItem', {
    extend: 'Ext.dataview.component.DataItem',
    alias: 'widget.myDebtListItem',

    config: {
        baseCls: 'x-data-item',
        updateRecord: function(newRecord, oldRecord) {

            //bug in framework, this stops propagation of event in deleteButtonTap and allows the record to be deleted from the store
            this.callParent(arguments);

            newRecord.getData(true);
            this.child('component').setData(newRecord.data);
        },
        cls: [
            'x-list-item'
        ],
        items: [
            {
                xtype: 'container',
                baseCls: 'x-list-item-label',
                itemId: 'debtListItemDetail',
                tpl: [
                    '<div>',
                    '<tpl for="Person">',
                    '{name}',
                    '</tpl>',
                    ' - {reason} - ${balance}</div>'
                ],
                items: [
                    {
                        xtype: 'button',
                        docked: 'right',
                        hidden: true,
                        itemId: 'deleteDebt',
                        ui: 'decline-round',
                        text: 'delete'
                    }
                ]
            }
        ],
        listeners: [
            {
                fn: 'onDebtDeleteButtonTap',
                event: 'tap',
                delegate: '#deleteDebt'
            }
        ]
    },

    onDebtDeleteButtonTap: function(button, e, options) {

        //bug in framework, stops propagation of event, without this sometimes both the itemtap 
        //and deletebuttontap would get fired after a previous record is deleted. this.callParent in updateRecords fixes this also.
        e.stopEvent(); 

        var dataview = this.up('dataview');
        var debt = this.getRecord();

        //remove payments from debt
        var payments = debt.payments();
        var paymentStore = Ext.getStore('Payments');
        paymentStore.remove(payments.getData().items); //remove from store
        payments.removeAll(); //remove from associated store
        paymentStore.sync(); //sync payments with localStorage

        //remove debt from debt store, and sync with localStorage
        debt.getPerson().debts().remove(debt);
        dataview.getStore().remove(debt);
        dataview.getStore().sync();

        debt.getPerson().calcBalance(); //calc balance
    },

    updateRecord: function(newRecord, oldRecord) {

        //bug in framework, this stops propagation of event in deleteButtonTap and allows the record to be deleted from the store
        this.callParent(arguments);

        newRecord.getData(true);
        this.child('component').setData(newRecord.data);
    }

});