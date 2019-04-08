import * as grpc from 'grpc';
import { isGrpcErrorStatus } from './status';

class PromiseCatchErrorHandlerError extends Error implements grpc.ServiceError {
	code = grpc.status.INTERNAL;
	details: string = '';

	constructor(message: string) {
		super('Error handler exception: ' + message);
		this.details = this.message;
	}
}

function catchGrpcPromiseUnaryError<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
	, errorHandler: (err: any) => void
	)
{
	const originalRpc = serviceImplCtor.prototype[rpcName];

	serviceImplCtor.prototype[rpcName] = async function
		( call: grpc.ServerUnaryCall<any>
		, originalCallback: grpc.sendUnaryData<any>
		)
	{
		let callbackInvoked = false;
		const callback = (err: any, response: any) => {

			if(callbackInvoked) {
				// @TODO: Warn about multi invoke of callback
			}

			callbackInvoked = true;

			if(err) {
				try {
					errorHandler(err);
				} catch(errHandlerErr) {
					err = new PromiseCatchErrorHandlerError(errHandlerErr.message);
				}

				// Prevent startBatch failed error
				if(!isGrpcErrorStatus(err.code)) {
					err.code = grpc.status.INTERNAL;
				}
			}

			return originalCallback(err, response);
		};

		try {
			const result = originalRpc.call(this, call, callback);
			await result;
		} catch(err) {
			callback(err, null);
			throw err;
		}

		if(!callbackInvoked) {
			callback(new Error('Callback not invoked after promise fullfilled'), null);
		}
	};
}

function catchGrpcPromiseBidiError<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[]) => T
	, errorHandler: (err: any) => void
	)
{
	// @TODO: Implement bidi stream catch
}

function catchGrpcPromiseRequestStreamError<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
	, errorHandler: (err: any) => void
	)
{
	// @TODO: Implement request stream catch
}

function catchGrpcPromiseResponseStreamError<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
	, errorHandler: (err: any) => void
	)
{
	const originalRpc = serviceImplCtor.prototype[rpcName];

	serviceImplCtor.prototype[rpcName] = async function
		( stream: grpc.ServerWriteableStream<any>
		)
	{
		try {
			const result = originalRpc.call(this, stream);
			await result;
		} catch(err) {
			stream.emit('error', err);
			if(stream.writable) stream.end();
			throw err;
		}

		if(stream.writable) stream.end();
	};
}

export function catchGrpcPromiseErrors<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, serviceImplCtor: new (...args: any[]) => T
	, errorHandler?: (err: any) => void
	)
{

	if(!errorHandler) {
		errorHandler = () => {};
	}

	for(let rpcName in serviceDef) {
		const rpcDef = serviceDef[rpcName];
		
		if(!rpcDef.requestStream && !rpcDef.responseStream) {
			catchGrpcPromiseUnaryError(serviceDef, rpcName, serviceImplCtor, errorHandler);
		} else
		if(rpcDef.requestStream && rpcDef.responseStream) {
			catchGrpcPromiseBidiError(serviceDef, rpcName, serviceImplCtor, errorHandler);
		} else
		if(rpcDef.requestStream) {
			catchGrpcPromiseRequestStreamError(serviceDef, rpcName, serviceImplCtor, errorHandler);
		} else
		if(rpcDef.responseStream) {
			catchGrpcPromiseResponseStreamError(serviceDef, rpcName, serviceImplCtor, errorHandler);
		}
	}
}
