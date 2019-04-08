import * as grpc from 'grpc';

export function isGrpcStatus
	( status: any
	): status is grpc.status
{
	switch(status) {
		case grpc.status.OK:
		case grpc.status.CANCELLED:
		case grpc.status.UNKNOWN:
		case grpc.status.INVALID_ARGUMENT:
		case grpc.status.DEADLINE_EXCEEDED:
		case grpc.status.NOT_FOUND:
		case grpc.status.ALREADY_EXISTS:
		case grpc.status.PERMISSION_DENIED:
		case grpc.status.RESOURCE_EXHAUSTED:
		case grpc.status.FAILED_PRECONDITION:
		case grpc.status.ABORTED:
		case grpc.status.OUT_OF_RANGE:
		case grpc.status.UNIMPLEMENTED:
		case grpc.status.INTERNAL:
		case grpc.status.UNAVAILABLE:
		case grpc.status.DATA_LOSS:
		case grpc.status.UNAUTHENTICATED:
			return true;
	}

	return false;
}

export function isGrpcErrorStatus
	( status: any
	): status is grpc.status
{
	if(isGrpcStatus(status) && status !== grpc.status.OK) {
		return true;
	}

	return false;
}
