export type Plan = {
  title?: string;
  summary?: string;
  assumptions?: string[];
  risks?: string[];
  team_members?: TeamMember[];
  epics: Epic[];
};

export type Epic = {
  id?: string;
  title: string;
  description?: string;
  assignees?: string[];
  stories: Story[];
};

export type Story = {
  id?: string;
  title: string;
  description?: string;
  assignees?: string[];
  tasks: Task[];
};

export type Task = {
  id?: string;
  title: string;
  description?: string;
  completion_requirements: string[];
  subtasks: Subtask[];
  assignees?: string[];
};

export type Subtask = {
  id?: string;
  title: string;
  description?: string;
};

export type TeamMember = {
  name: string;
  skills: string[];
};
