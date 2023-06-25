import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { safeParseJson } from "../Core/Utils/JSON";
import { perhaps } from "../Core/Utils/Promise";

const client = new S3Client({
  region: "eu-central-1",
});

type Body = {
  fileName: string;
  fileType: string;
  userId: string;
  projectId: string;
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Could also be queryStringParameters or pathParameters
  const eventBody = safeParseJson<Body>(event.body);

  // I would run validation here, but I'm skipping it for brevity

  // Create the putObject command to be used by the presigner
  const command = new PutObjectCommand({
    Bucket: "my-bucket", // Get the value from environment variable
    Key: `RAW/${eventBody.userId}/${eventBody.projectId}/${eventBody.fileName}`,
    ACL: "public-read",
    ContentType: eventBody.fileType,
    // More keys can be added here to increase strictness
  });

  // Generate a presigned url to return to the consumer, so the browser can send the file directly to S3
  const [urlError, url] = await perhaps(
    getSignedUrl(client, command, {
      expiresIn: 3600,
    })
  );

  if (urlError) {
    // Handle the error better than this...
    throw urlError;
  }

  // Return the presigned URL to the client
  return {
    statusCode: 200,
    body: url,
  };
};
