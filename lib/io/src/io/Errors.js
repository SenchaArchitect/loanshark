/**
 * @private
 *
 */
Ext.define('Ext.io.Errors', {
	statics: {
		'NETWORK_ERROR': {
			code: 'NETWORK_ERROR',
			message: 'The request could not be made due to the network being down',
			suggest: 'Check network connectivity from your device'
		},

		'UNKNOWN_ERROR': {
			code: 'UNKNOWN_ERROR',
			message: 'Unknown error',
			kind: 'sio',
			suggest: 'Contact sencha.io support with a description of what caused the error'
		},

		'UNKNOWN_RPC_ERROR': {
			code: 'UNKNOWN_RPC_ERROR',
			message: 'Unknown RPC error',
			kind: 'sio',
			suggest: 'Fix the RPC service to return a valid error object'
		},

		'PARAM_MISSING': {
			code: 'PARAM_MISSING',
			message: "Mandatory parameter ':name' is missing",
			kind: 'developer',
			suggest: 'Provide the required parameter during the method call' 
		},

		'PARAMS_LENGTH_MISMATCH': {
			code: 'PARAMS_LENGTH_MISMATCH',
			message: 'The method was passed :actual params instead of the expected :expected',
			kind: 'developer',
			suggest: 'Check the number of parameters you are passing to the method' 
		},

		'PARAM_TYPE_MISMATCH': {
			code: 'PARAM_TYPE_MISMATCH',
			message: "Parameter ':name' data type mismatch. Expected ':expected', actual ':actual'",
			kind: 'developer',
			suggest: 'Correct the data type of the parameter' 
		},

		'RPC_PARAM_FUNCTION_ERROR': {
			code: 'RPC_PARAM_FUNCTION_ERROR',
			message: "Parameter number :index (:name) is a function, but only the first parameter must be a function",
			kind: 'developer',
			suggest: 'Ensure that only the first parameter is a function' 
		},

		'RPC_TIMEOUT': {
			code: 'RPC_TIMEOUT',
			message: 'RPC request has timed out as there was no reply from the server',
			kind: 'developer',
			suggest: 'Check if this was caused by network connectivity issues. If not, the service might be down.' +
				' Also, see documentation for Ext.Io.setup (rpcTimeoutDuration, rpcTimeoutCheckInterval) to configure the timeout check' 
		},

		'AUTH_REQUIRED': {
			code: 'AUTH_REQUIRED',
			message: 'This request requires an authenticated :kind session',
			kind: 'developer',
			suggest: 'Retry the request with a valid session'
		},
		
		'CHANNEL_NAME_MISSING': {
			code: 'CHANNEL_NAME_MISSING',
			message: 'Channel name is missing',
			kind: 'developer',
			suggest: 'Provide the channel name'
		},

		'CHANNEL_APP_ID_MISSING': {
			code: 'CHANNEL_APP_ID_MISSING',
			message: 'Channel appId is missing',
			kind: 'sio',
			suggest: 'Potential bug in the SIO SDK, attempting to get a channel without an appId'
		},

		'SERVICE_NAME_MISSING': {
			code: 'SERVICE_NAME_MISSING',
			message: 'Service name is missing',
			kind: 'developer',
			suggest: 'Provide the service name'
		},

		'SERVICE_DESCRIPTOR_LOAD_ERROR': {
			code: 'SERVICE_DESCRIPTOR_LOAD_ERROR',
			message: 'Error loading service descriptor from the server',
			kind: 'developer',
			suggest: 'Service name is most likely misspelt. If not, contact sencha.io support'
		},

		'MESSAGE_NOT_JSON': {
			code: 'MESSAGE_NOT_JSON',
			message: 'message is not a JSON object',
			kind: 'developer',
			suggest: 'Use a valid JSON object instead of basic data types'
		}
	}
});
