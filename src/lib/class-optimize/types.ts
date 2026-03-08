export interface Student {
	name: string;
	grade: number;
	classNum: number;
	number: number;
	score: number;
	id: string;
}

export type RuleType = 'no_together' | 'separate_1_to_n' | 'same_name_separate';

export interface PlacementRule {
	id: string;
	type: RuleType;
	priority: number;
	studentIds: string[];
	label: string;
}

export interface ClassAssignment {
	classNum: number;
	students: Student[];
	averageScore: number;
}

export interface ValidationViolation {
	rule: PlacementRule;
	involvedStudents: Student[];
	assignedClass: number;
	message: string;
}

export interface OptimizationResult {
	assignments: ClassAssignment[];
	violations: ValidationViolation[];
}
