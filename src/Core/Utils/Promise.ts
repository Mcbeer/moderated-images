/**
 * Converts a possibly rejected promise to a node callback-like syntax
 */
export async function perhaps<T>(
  promise: Promise<T>
): Promise<[Error | null, T] | [Error, null]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error as Error, null];
  }
}

/**
 * Simple delay function
 */
export const delay = (args: { waitSeconds: number }): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), args.waitSeconds * 1000);
  });
};

type WithRetryArgs = {
  retryAttempt?: number;
  maxRetries?: number;
  lastErrorMessage?: string;
};

/**
 * Simple retry function with crude incremental backoff
 */
export const withRetry =
  ({ retryAttempt = 0, maxRetries = 5, lastErrorMessage }: WithRetryArgs) =>
  async <T>(fn: Promise<T>): Promise<T> => {
    if (retryAttempt > maxRetries) {
      throw new Error(lastErrorMessage ?? "Retry failed too many times...");
    }

    const result = fn.catch((err: Error) =>
      delay({ waitSeconds: 1 * retryAttempt + 1 }).then(() =>
        withRetry({
          retryAttempt: retryAttempt + 1,
          lastErrorMessage: err.message,
        })(fn)
      )
    );

    return result;
  };
