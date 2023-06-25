import { APIGatewayProxyEvent } from "aws-lambda";
import { safeParseJson } from "../Core/Utils/JSON";
import { ddbDocClient } from "../Core/DynamoDB";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { perhaps } from "../Core/Utils/Promise";

export const handler = async (event: APIGatewayProxyEvent) => {
  // This case we kinda rely on all the values being sent to us, it would be better to filter out the undefined values
  const { imageId, userId, projectId, annotations, description, metadata } =
    safeParseJson<{
      imageId: string;
      userId: string;
      projectId: string;
      annotations?: string[];
      description?: string;
      metadata?: Record<string, string>;
    }>(event.body);

  // In the real would, data validation would go right here

  const updateImageData = {};

  // Add the project to DynamoDB
  const [putError, updatedProject] = await perhaps(
    ddbDocClient.send(
      new UpdateCommand({
        TableName: "my-table", // Get from env variables
        Key: {
          PK: `USER#${userId}`,
          SK: `IMAGE#${projectId}#${imageId}`,
        },
        UpdateExpression:
          "SET annotations = :annotations, description = :description, metadata = :metadata",
        ExpressionAttributeValues: {
          ":annotations": annotations,
          ":description": description,
          ":metadata": metadata,
        },
        ReturnValues: "ALL_NEW",
      })
    )
  );

  if (putError) {
    // Handle the error better than this...
    throw putError;
  }

  // Images has now been updated, steams will take over from here.
};
