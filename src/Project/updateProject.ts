import { APIGatewayProxyEvent } from "aws-lambda";
import { safeParseJson } from "../Core/Utils/JSON";
import { ddbDocClient } from "../Core/DynamoDB";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { perhaps } from "../Core/Utils/Promise";
import { Project, ProjectStatus } from "../Core/Types";

export const handler = async (event: APIGatewayProxyEvent) => {
  // Get the user id from the event
  // Get the project name from the event
  const { userId, projectId, projectName, status } = safeParseJson<{
    userId: string;
    projectId: string;
    projectName: string;
    status: (typeof ProjectStatus)[keyof typeof ProjectStatus];
  }>(event.body);

  // In the real would, data validation would go right here

  const updatedProjectObject: Partial<Project> &
    Pick<Project, "id" | "userId"> = {
    id: projectId,
    userId,
    projectName,
    status,
  };

  // Add the project to DynamoDB
  const [putError, updatedProject] = await perhaps(
    ddbDocClient.send(
      new UpdateCommand({
        TableName: "my-table", // Get from env variables
        Key: {
          PK: `USER#${userId}`,
          SK: `PROJECT#${updatedProjectObject.id}`,
        },
        UpdateExpression: "SET projectName = :projectName, status = :status",
        ExpressionAttributeValues: {
          ":projectName": updatedProjectObject.projectName,
          ":status": updatedProjectObject.status,
        },
        ReturnValues: "ALL_NEW",
      })
    )
  );

  if (putError) {
    // Handle the error better than this...
    throw putError;
  }

  // No need to return PK and SK to the user, only the project is needed
  const { PK, SK, ...project } = updatedProject.Attributes;
  return {
    statusCode: 200,
    body: JSON.stringify(project),
  };
};
