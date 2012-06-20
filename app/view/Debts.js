/*
 * File: app/view/Debts.js
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

Ext.define('Payback.view.Debts', {
    extend: 'Ext.Panel',
    alias: 'widget.Debts',

    config: {
        layout: {
            type: 'fit'
        },
        tab: {
            iconCls: 'info',
            iconMask: true,
            baseCls: 'x-button',
            flex: 1,
            iconAlign: 'center'
        },
        items: [
            {
                xtype: 'titlebar',
                docked: 'bottom',
                items: [
                    {
                        xtype: 'button',
                        id: 'addDebt',
                        ui: 'confirm',
                        text: 'Add'
                    }
                ]
            },
            {
                xtype: 'dataview',
                baseCls: 'x-list',
                cls: [
                    'x-list-normal'
                ],
                id: 'myDebtDataView',
                defaultType: 'myDebtListItem',
                store: 'Debts',
                useComponents: true,
                disableSelection: true
            }
        ],
        listeners: [
            {
                fn: 'onPanelShow',
                event: 'show'
            }
        ]
    },

    onPanelShow: function(component, options) {
        //clears filter if one is on the store, filters are set when contact item is tapped
        Ext.getStore('Debts').clearFilter();
    }

});