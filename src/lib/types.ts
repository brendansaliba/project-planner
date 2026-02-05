export type Plan = {
  title?: string;
  summary?: string;
  assumptions?: string[];
  risks?: string[];
  epics: Epic[];
};

export type Epic = {
  id?: string;
  title: string;
  description?: string;
  stories: Story[];
};

export type Story = {
  id?: string;
  title: string;
  description?: string;
  tasks: Task[];
};

export type Task = {
  id?: string;
  title: string;
  description?: string;
  completion_requirements: string[];
  subtasks: Subtask[];
};

export type Subtask = {
  id?: string;
  title: string;
  description?: string;
};
