import { DynamoDBStreamEvent } from "aws-lambda";
import { Project, ProjectImage } from "./Types";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { perhaps, withRetry } from "../Core/Utils/Promise";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

const eventBridgeClient = new EventBridgeClient({
  region: "eu-central-1",
});

export const handler = async (event: DynamoDBStreamEvent) => {
  const allProjectsAndImages = event.Records.reduce((accumulator, record) => {
    const dynamoDBData = unmarshall(
      record.dynamodb?.NewImage as Record<string, AttributeValue>
    );

    // We now know we have a project that has been updated
    if (record.dynamodb.NewImage.SK.S.startsWith("PROJECT#")) {
      // The "NewImage" is a marshalled DynamoDB record, so we need to unmarshall it
      // Yes it's a type hack, but AWS can't type their own stuff properly

      const { PK, SK, ...project } = dynamoDBData as {
        PK: `USER#${string}`;
        SK: `PROJECT#${string}`;
      } & Project;

      // Use mutation to avoid creating too much memory *Premature optimization*
      accumulator.push({ type: "project", data: project });

      return accumulator;
    }

    if (record.dynamodb.NewImage.SK.S.startsWith("IMAGE#")) {
      // The "NewImage" is a marshalled DynamoDB record, so we need to unmarshall it
      // Yes it's a type hack, but AWS can't type their own stuff properly
      const { PK, SK, ...image } = dynamoDBData as {
        PK: `USER#${string}`;
        SK: `IMAGE#${string}`;
      } & ProjectImage;

      // Use mutation to avoid creating too much memory *Premature optimization*
      accumulator.push({ type: "image", data: image });

      return accumulator;
    }
  }, []);

  // In the real world, we would probably want to do some validation here

  // One could also just emit a "project" updated event, since images are parts of the project
  // But if we need to do more work on the images themselves, we can have a listener for that event only
  const emitCommand = new PutEventsCommand({
    Entries: allProjectsAndImages.map((projectOrImage) => {
      if (projectOrImage.type === "project") {
        return {
          EventBusName: "my-event-bus", // Get the value from environment variable
          Source: "my-app", // Get the value from environment variable
          DetailType: "project-updated",
          Detail: JSON.stringify(projectOrImage.data),
        };
      }

      if (projectOrImage.type === "image") {
        return {
          EventBusName: "my-event-bus", // Get the value from environment variable
          Source: "my-app", // Get the value from environment variable
          DetailType: "image-updated",
          Detail: JSON.stringify(projectOrImage.data),
        };
      }
    }),
  });

  await perhaps(
    withRetry({ maxRetries: 5 })(eventBridgeClient.send(emitCommand))
  );
};
