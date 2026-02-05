export const planSchema = {
  name: "project_plan",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "assumptions", "risks", "epics"],
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      assumptions: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      epics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "description", "stories"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            stories: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "title", "description", "tasks"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["id", "title", "description", "completion_requirements", "subtasks"],
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        completion_requirements: {
                          type: "array",
                          items: { type: "string" }
                        },
                        subtasks: {
                          type: "array",
                          minItems: 1,
                          items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["id", "title", "description"],
                            properties: {
                              id: { type: "string" },
                              title: { type: "string" },
                              description: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;
