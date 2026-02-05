export const planSchema = {
  name: "project_plan",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "assumptions", "risks", "team_members", "epics"],
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      assumptions: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      team_members: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "skills"],
          properties: {
            name: { type: "string" },
            skills: { type: "array", items: { type: "string" } }
          }
        }
      },
      epics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "description", "stories", "assignees"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            assignees: { type: "array", items: { type: "string" } },
            stories: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "title", "description", "tasks", "assignees"],
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  assignees: { type: "array", items: { type: "string" } },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "id",
                        "title",
                        "description",
                        "completion_requirements",
                        "subtasks",
                        "assignees"
                      ],
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        assignees: { type: "array", items: { type: "string" } },
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
