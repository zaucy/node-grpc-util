import { ServiceDefinition, ServerUnaryCall, sendUnaryData } from "grpc";

function catchGrpcPromiseUnaryError<T>
	( serviceDef: ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
	)
{
	const originalRpc = serviceImplCtor.prototype[rpcName];

	serviceImplCtor.prototype[rpcName] = async function
		( call: ServerUnaryCall<any>
		, originalCallback: sendUnaryData<any>
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
	( serviceDef: ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[]) => T
	)
{
	// @TODO: Implement bidi stream catch
}

function catchGrpcPromiseRequestStreamError<T>
	( serviceDef: ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
	)
{
	// @TODO: Implement request stream catch
}

function catchGrpcPromiseResponseStreamError<T>
	( serviceDef: ServiceDefinition<T>
	, rpcName: string
	, serviceImplCtor: new (...args: any[])=> T
	)
{
	// @TODO: Implement response stream catch
}

export function catchGrpcPromiseErrors<T>
	( serviceDef: ServiceDefinition<T>
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
