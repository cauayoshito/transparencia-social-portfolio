export type ProjectGoal = {
  title?: string;
  description?: string;
  indicator?: string;
  due_date?: string;
  status?: string;
};

export type ProjectMilestone = {
  title?: string;
  description?: string;
  due_date?: string;
  status?: string;
};

export type ProjectPlanSchedule = Record<string, unknown> & {
  milestones: ProjectMilestone[];
};

export type ProjectPlanData = Record<string, unknown> & {
  objective_general: string;
  goals: ProjectGoal[];
  schedule: ProjectPlanSchedule;
  updated_at?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeGoal(value: unknown): ProjectGoal | null {
  const raw = asRecord(value);
  const title = asString(raw.title);
  const description = asString(raw.description);
  const indicator = asString(raw.indicator);
  const dueDate = asString(raw.due_date);
  const status = asString(raw.status);

  if (!title && !description && !indicator && !dueDate && !status) {
    return null;
  }

  return {
    title: title || undefined,
    description: description || undefined,
    indicator: indicator || undefined,
    due_date: dueDate || undefined,
    status: status || undefined,
  };
}

function normalizeMilestone(value: unknown): ProjectMilestone | null {
  const raw = asRecord(value);
  const title = asString(raw.title);
  const description = asString(raw.description);
  const dueDate = asString(raw.due_date);
  const status = asString(raw.status);

  if (!title && !description && !dueDate && !status) {
    return null;
  }

  return {
    title: title || undefined,
    description: description || undefined,
    due_date: dueDate || undefined,
    status: status || undefined,
  };
}

export function readProjectPlanObjective(input: unknown): string {
  const raw = asRecord(input);

  return asString(raw.objective_general) || asString(raw.objective);
}

export function normalizeProjectPlanData(input: unknown): ProjectPlanData {
  const raw = asRecord(input);
  const { objective: _legacyObjective, ...rest } = raw;
  const schedule = asRecord(raw.schedule);

  const goals = asArray(raw.goals)
    .map(normalizeGoal)
    .filter((item): item is ProjectGoal => item !== null);

  const milestoneSource =
    raw.milestones !== undefined ? raw.milestones : schedule.milestones;

  const milestones = asArray(milestoneSource)
    .map(normalizeMilestone)
    .filter((item): item is ProjectMilestone => item !== null);

  return {
    ...rest,
    objective_general: readProjectPlanObjective(raw),
    goals,
    schedule: {
      ...schedule,
      milestones,
    },
  };
}

export function buildProjectPlanData(
  input: unknown,
  objectiveGeneral: string
): ProjectPlanData {
  const normalized = normalizeProjectPlanData(input);

  return {
    ...normalized,
    objective_general: objectiveGeneral.trim(),
    goals: normalized.goals,
    schedule: {
      ...normalized.schedule,
      milestones: normalized.schedule.milestones,
    },
    updated_at: new Date().toISOString(),
  };
}
