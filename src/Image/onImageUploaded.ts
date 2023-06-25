import { S3CreateEvent } from "aws-lambda";
import {
  CopyObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { perhaps, withRetry } from "../Core/Utils/Promise";
import { ProjectImage } from "../Core/Types";
import { randomUUID } from "crypto";

const client = new S3Client({
  region: "eu-central-1",
});

const eventBridgeClient = new EventBridgeClient({
  region: "eu-central-1",
});

export const handler = async (s3Event: S3CreateEvent) => {
  const fileKey = s3Event.Records[0].s3.object.key;

  // Get the file from S3
  const command = new GetObjectCommand({
    Bucket: "my-bucket", // Get the value from environment variable
    Key: fileKey,
  });

  const [s3fileError, s3file] = await perhaps(client.send(command));

  if (s3fileError) {
    // Handle the error better than this...
    throw s3fileError;
  }

  // Convert the file to a string
  const [fileStringError, fileString] = await perhaps(
    s3file.Body.transformToString()
  );

  if (fileStringError) {
    // Handle the error better than this...
    throw fileStringError;
  }

  // Run the moderation service
  const [scoreError, score] = await perhaps(moderationService(fileString));

  if (scoreError) {
    // Handle the error better than this...
    throw scoreError;
  }

  // If the score is above 50, delete the file
  if (score > 50) {
    // Delete the file from S3
    // Possible emit an event to notify the user that the image was deleted
    return {
      statusCode: 200,
      body: "Inaproppriate image deleted",
    };
  }

  // Copy the image to a different path in the bucket where valid photos live
  const [copyError] = await perhaps(
    withRetry({ maxRetries: 5 })(
      client.send(
        new CopyObjectCommand({
          Bucket: "my-bucket", // Get the value from environment variable
          CopySource: `my-bucket/${fileKey}`,
          Key: `VALID/${fileKey}`,
        })
      )
    )
  );

  if (copyError) {
    // Handle the error better than this...
    throw copyError;
  }

  const projectImage: ProjectImage = {
    id: randomUUID(),
    url: `https://my-bucket.s3.eu-central-1.amazonaws.com/VALID/${fileKey}`,
    order: 0,
    score,
  };

  // Emit the image url to EventBridge Bus to be added to the database
  const emitCommand = new PutEventsCommand({
    Entries: [
      {
        EventBusName: "my-event-bus", // Get the value from environment variable
        Source: "my-app", // Get the value from environment variable
        DetailType: "image",
        Detail: JSON.stringify(projectImage),
      },
    ],
  });

  await perhaps(
    withRetry({ maxRetries: 5 })(eventBridgeClient.send(emitCommand))
  );

  return {
    statusCode: 200,
    body: "OK",
  };
};

// This is a mock moderation service
// It returns a score of how likely the image is to be inappropriate
const moderationService = async (file: string): Promise<number> => {
  const random = Math.random() * 100;
  return Promise.resolve(random);
};
