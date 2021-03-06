/*
 * File: app/view/Summary.js
 *
 * This file was generated by Sencha Architect version 2.2.0.
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

Ext.define('Payback.view.Summary', {
    extend: 'Ext.Container',
    alias: 'widget.Summary',

    config: {
        id: 'SummaryView',
        style: 'background:black;',
        layout: {
            type: 'fit'
        },
        scrollable: false,
        items: [
            {
                xtype: 'image',
                mode: 'background',
                style: 'background-repeat: no-repeat; background-size: auto 100%;background-position: center center;',
                src: 'resources/images/sharky.png'
            },
            {
                xtype: 'component',
                docked: 'bottom',
                height: '',
                id: 'SummaryContents',
                style: 'font-weight: bold;font-size:1.5em;background-color:#910002;',
                tpl: [
                    '<center style=\'color:white;padding-top: .43em;padding-bottom: .43em;\'>You\'re Owed: {totalOwed}</center>'
                ]
            }
        ]
    }

});