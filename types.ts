export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: string; // 'Anna' | 'Bella' | 'Chloe'
  isCompleted: boolean;
  priority: Priority;
  createdAt: number;
}

export const SISTERS = ['Anna', 'Bella', 'Chloe'] as const;
export type SisterName = typeof SISTERS[number];

export interface DashboardStats {
  name: string;
  completed: number;
  pending: number;
  total: number;
}

export interface SmartTaskResponse {
  tasks: {
    title: string;
    assignee: SisterName;
    priority: Priority;
    description?: string;
  }[];
}