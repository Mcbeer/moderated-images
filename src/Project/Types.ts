export type Project = {
  id: string;
  userId: string;
  projectName: string;
  status: (typeof ProjectStatus)[keyof typeof ProjectStatus];
};

export type ProjectImage = {
  id: string;
  url: string;
  order: number;
  score: number;
  annotations?: string[];
  description?: string;
  metadata?: Record<string, string>;
};

export const ProjectStatus = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
} as const;

export type ProjectWithImages = Project & {
  images: ProjectImage[];
};
