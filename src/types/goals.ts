export interface GoalStep {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  steps: GoalStep[];
  completed: boolean;
  createdAt: string;
}
