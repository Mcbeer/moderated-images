import {
  APIGatewayEventRequestContext,
  APIGatewayProxyEvent,
} from "aws-lambda";
import { Project, ProjectImage, ProjectWithImages } from "../Core/Types";
import { ddbDocClient } from "../Core/DynamoDB";
import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { perhaps } from "../Core/Utils/Promise";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<ProjectWithImages> => {
  const { projectId } = event.pathParameters;

  // The authorizer would need to save the userId here
  const { userId } = context.authorizer.userId;

  // Get the project from DynamoDB
  const [getProjectError, project] = await perhaps(
    ddbDocClient.send(
      new GetCommand({
        TableName: "my-table", // Get from env variables
        Key: {
          PK: marshall(`USER#${userId}`),
          SK: marshall(`PROJECT#${projectId}`),
        },
      })
    )
  );

  if (getProjectError) {
    // Handle the error better than this...
    throw getProjectError;
  }

  if (!project.Item) {
    // Handle the error better than this...
    throw new Error("Project not found");
  }

  // In real life i would validate the data here, not just cast it
  const projectData = project.Item as Project;

  // Get the images from DynamoDB
  const [getImagesError, images] = await perhaps(
    ddbDocClient.send(
      new QueryCommand({
        TableName: "my-table", // Get from env variables
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": marshall(`USER#${userId}`),
          ":sk": marshall(`IMAGE#${projectId}`),
        },
      })
    )
  );

  if (getImagesError) {
    // Handle the error better than this...
    throw getImagesError;
  }

  // Yet again, i would validate the data with something like Zod here instead of casting it
  const imagesData = images.Items.map((imageData) =>
    unmarshall(imageData)
  ) as Record<string, any> as ProjectImage[];

  // Return the project with the images
  return {
    ...projectData,
    images: imagesData,
  };
};
