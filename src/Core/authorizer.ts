import {
  APIGatewayAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from "aws-lambda";

const denyRequest = (methodArn: string) => {
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Deny",
          Resource: methodArn,
        },
      ],
    },
  };
};

const allowRequest = (methodArn: string) => {
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Allow",
          Resource: methodArn,
        },
      ],
    },
  };
};

export const handler = async (
  event: APIGatewayAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  // Call the authentication service
  // If the user is authenticated, return an IAM policy with allow
  // If the user is not authenticated, return n IAM pocliy with deny

  if (event.type !== "REQUEST") {
    return denyRequest(event.methodArn);
  }

  const isAuthorized = await mockAuthService(
    event.queryStringParameters.userToken,
    event.queryStringParameters.projectId
  );

  if (!isAuthorized) {
    return denyRequest(event.methodArn);
  }

  return allowRequest(event.methodArn);
};

const mockAuthService = (userToken: string, projectId: string) => {
  return userToken === "123" && projectId === "456";
};
