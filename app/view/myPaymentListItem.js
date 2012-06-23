/*
 * File: app/view/myPaymentListItem.js
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

Ext.define('Payback.view.myPaymentListItem', {
    extend: 'Ext.dataview.component.DataItem',
    alias: 'widget.myPaymentListItem',

    config: {
        baseCls: 'x-data-item',
        updateRecord: function(newRecord, oldeRecord) {
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
                itemId: 'paymentListItemDetail',
                tpl: [
                    '<div>',
                    '',
                    '{[(values.amount<0)?\'-\':\'\']}${[Math.abs(values.amount)]}',
                    '<span style=\'float:right;color:#555;font-size:15px;\'>{[Ext.Date.format(values.date,\'m/d\')]}</span>',
                    '    ',
                    '</div>'
                ],
                items: [
                    {
                        xtype: 'button',
                        docked: 'right',
                        hidden: true,
                        itemId: 'deletePayment',
                        margin: '0 0 0 10px',
                        ui: 'gray-button',
                        text: 'delete'
                    }
                ]
            }
        ],
        listeners: [
            {
                fn: 'onPaymentDeleteButtonTap',
                event: 'tap',
                delegate: '#deletePayment'
            }
        ]
    },

    onPaymentDeleteButtonTap: function(button, e, options) {

        //retrieve dataview and payment
        var dataview = this.up('dataview');
        var payment = this.getRecord();

        //removes payment from debt, then from the store
        payment.getDebt().payments().remove(payment);
        dataview.getStore().remove(payment);
        dataview.getStore().sync(); //sync with local storage

        //update the debt balance on deleted payment
        var debtRecord = dataview.up('DebtDetail').getRecord();
        debtRecord.set('balance',0); //bug in framework, calls convert field again on debt
        debtRecord.getPerson().calcBalance(); //calc balance of updated payments and debt in person

        //update the summary
        Payback.app.application.getController('Payback.controller.Summary').updateSummary();

        //refresh DataView
        //dataview.refresh();
    },

    updateRecord: function(newRecord, oldeRecord) {
        //bug in framework, this stops propagation of event in deleteButtonTap and allows the record to be deleted from the store
        this.callParent(arguments);

        newRecord.getData(true);
        this.child('component').setData(newRecord.data);
    }

});