import * as grpc from 'grpc';


function catchGrpcPromiseUnaryError<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
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
	)
{
	// @TODO: Implement bidi stream catch
}

function catchGrpcPromiseRequestStreamError<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
	)
{
	// @TODO: Implement request stream catch
}

function catchGrpcPromiseResponseStreamError<T>
	( serviceDef: grpc.ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
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
	for(let rpcName in serviceDef) {
		const rpcDef = serviceDef[rpcName];
		
		if(!rpcDef.requestStream && !rpcDef.responseStream) {
			catchGrpcPromiseUnaryError(serviceDef, rpcName, serviceImplCtor);
		} else
		if(rpcDef.requestStream && rpcDef.responseStream) {
			catchGrpcPromiseBidiError(serviceDef, rpcName, serviceImplCtor);
		} else
		if(rpcDef.requestStream) {
			catchGrpcPromiseRequestStreamError(serviceDef, rpcName, serviceImplCtor);
		} else
		if(rpcDef.responseStream) {
			catchGrpcPromiseResponseStreamError(serviceDef, rpcName, serviceImplCtor);
		}
	}
}
