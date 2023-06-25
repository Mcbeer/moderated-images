export const safeParseJson = <T extends Record<string, unknown>>(
  json: string
): T | null => {
  try {
    return JSON.parse(json);
  } catch (e) {
    // This would be a great place to log the error
    return null;
  }
};
