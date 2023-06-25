import { SQSEvent } from "aws-lambda";
import { safeParseJson } from "../Core/Utils/JSON";
import { ProjectImage } from "../Core/Types";
import { perhaps } from "../Core/Utils/Promise";
import { ddbDocClient } from "../Core/DynamoDB";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

export const handler = async (event: SQSEvent) => {
  const projectImages = event.Records.map((record) =>
    safeParseJson<ProjectImage>(record.body)
  );

  // In the real would, data validation would go right here

  // For each project, add the image to the project

  for (const image of projectImages) {
    const [_, userId, projectId] = image.url.split("/");

    const [putError] = await perhaps(
      ddbDocClient.send(
        new PutCommand({
          TableName: "my-table", // Get from env variables
          Item: {
            PK: `USER#${userId}`,
            SK: `IMAGE#${projectId}#${image.id}`,
            id: image.id,
            url: image.url,
            order: image.order,
            score: image.score,
            annotations: image.annotations ?? [], // Default values here, since they can be undefined
            description: image.description ?? "",
            metadata: image.metadata ?? {},
          },
        })
      )
    );

    if (putError) {
      // Handle the error better than this...
      throw putError;
    }
  }
};
