import * as grpc from 'grpc';

export function promisifyClientUnaryCall<T>
	( rpcName: string
	, client: any
	)
{
	const originalRpc = client[rpcName];

	client[rpcName] = async function
		( request: any
		, metadata?: grpc.Metadata
		)
	{
		return new Promise((resolve, reject) => {
			originalRpc.call(client, request, metadata, (err: any, response: any) => {
				if(err) reject(err);
				else resolve(response);
			});
		});
	};
}

export function promisifyGrpcClient<T, ClientType extends grpc.Client>
	( serviceDef: grpc.ServiceDefinition<T>
	, client: ClientType,
	): grpc.Client
{
	for(let rpcName in serviceDef) {
		const rpcDef = serviceDef[rpcName];

		if(!rpcDef.requestStream && !rpcDef.responseStream) {
			promisifyClientUnaryCall(rpcName, client);
		} else
		if(rpcDef.requestStream && rpcDef.responseStream) {
			
		} else
		if(rpcDef.requestStream) {
			
		} else
		if(rpcDef.responseStream) {
			
		}
	}

	return client;
}
