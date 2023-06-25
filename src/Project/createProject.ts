import { APIGatewayProxyEvent } from "aws-lambda";
import { safeParseJson } from "../Core/Utils/JSON";
import { randomUUID } from "crypto";
import { ddbDocClient } from "../Core/DynamoDB";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { perhaps } from "../Core/Utils/Promise";
import { Project, ProjectStatus } from "./Types";

export const handler = async (event: APIGatewayProxyEvent) => {
  // Get the user id from the event
  // Get the project name from the event
  const { userId, projectName } = safeParseJson<{
    userId: string;
    projectName: string;
  }>(event.body);

  const newProject: Project = {
    id: randomUUID(),
    userId,
    projectName,
    status: ProjectStatus.PRIVATE,
  };

  // Add the project to DynamoDB
  const [putError, insertedProject] = await perhaps(
    ddbDocClient.send(
      new PutCommand({
        TableName: "my-table", // Get from env variables
        Item: {
          PK: `USER#${userId}`,
          SK: `PROJECT#${newProject.id}`,
          ...newProject,
        },
      })
    )
  );

  if (putError) {
    // Handle the error better than this...
    throw putError;
  }

  // No need to return PK and SK to the user, only the project is needed
  const { PK, SK, ...project } = insertedProject.Attributes;
  return {
    statusCode: 200,
    body: JSON.stringify(project),
  };
};
