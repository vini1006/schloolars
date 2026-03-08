import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';
import { validateAssignments } from '../class-validator';
import type { ClassAssignment, PlacementRule, Student } from '../types';

let studentCounter = 0;

function createStudent(overrides: Partial<Student> = {}): Student {
	studentCounter++;
	const grade = overrides.grade ?? faker.number.int({ min: 1, max: 6 });
	const classNum = overrides.classNum ?? faker.number.int({ min: 1, max: 5 });
	const number = overrides.number ?? studentCounter;
	return {
		name: overrides.name ?? faker.person.lastName() + faker.person.firstName(),
		grade,
		classNum,
		number,
		score: overrides.score ?? faker.number.int({ min: 0, max: 100 }),
		id: overrides.id ?? `${grade}-${classNum}-${number}`,
	};
}

function makeAssignment(
	classNum: number,
	students: Student[],
): ClassAssignment {
	const avg =
		students.length > 0
			? students.reduce((sum, s) => sum + s.score, 0) / students.length
			: 0;
	return { classNum, students, averageScore: avg };
}

describe('validateAssignments', () => {
	describe('no_together validation', () => {
		it('returns violation when specified students share a class', () => {
			const s1 = createStudent({ id: 'a1' });
			const s2 = createStudent({ id: 'a2' });
			const s3 = createStudent({ id: 'a3' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [s1, s2]),
				makeAssignment(2, [s3]),
			];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: ['a1', 'a2'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(1);
			expect(violations[0].assignedClass).toBe(1);
			expect(violations[0].involvedStudents).toHaveLength(2);
			expect(violations[0].message).toContain('같은 반');
		});

		it('returns no violation when specified students are in different classes', () => {
			const s1 = createStudent({ id: 'b1' });
			const s2 = createStudent({ id: 'b2' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [s1]),
				makeAssignment(2, [s2]),
			];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: ['b1', 'b2'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(0);
		});
	});

	describe('separate_1_to_n validation', () => {
		it('returns violation when N student shares anchor class', () => {
			const anchor = createStudent({ id: 'c1', name: '앵커' });
			const other = createStudent({ id: 'c2', name: '분리대상' });
			const filler = createStudent({ id: 'c3' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [anchor, other]),
				makeAssignment(2, [filler]),
			];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['c1', 'c2'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(1);
			expect(violations[0].assignedClass).toBe(1);
			expect(violations[0].message).toContain('분리대상');
			expect(violations[0].message).toContain('앵커');
		});

		it('returns no violation when anchor is separated from all N students', () => {
			const anchor = createStudent({ id: 'd1' });
			const sep1 = createStudent({ id: 'd2' });
			const sep2 = createStudent({ id: 'd3' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [anchor]),
				makeAssignment(2, [sep1]),
				makeAssignment(3, [sep2]),
			];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['d1', 'd2', 'd3'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(0);
		});

		it('returns no violations when rule has fewer than 2 studentIds', () => {
			const s1 = createStudent({ id: 'e1' });

			const assignments: ClassAssignment[] = [makeAssignment(1, [s1])];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['e1'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(0);
		});
	});

	describe('same_name_separate validation', () => {
		it('returns violation when same-name students are in the same class', () => {
			const s1 = createStudent({ id: 'f1', name: '홍길동' });
			const s2 = createStudent({ id: 'f2', name: '홍길동' });
			const s3 = createStudent({ id: 'f3', name: '김철수' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [s1, s2, s3]),
				makeAssignment(2, []),
			];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'same_name_separate',
				priority: 1,
				studentIds: [],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(1);
			expect(violations[0].message).toContain('홍길동');
			expect(violations[0].involvedStudents).toHaveLength(2);
			expect(violations[0].assignedClass).toBe(1);
		});

		it('returns no violation when same-name students are in different classes', () => {
			const s1 = createStudent({ id: 'g1', name: '홍길동' });
			const s2 = createStudent({ id: 'g2', name: '홍길동' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [s1]),
				makeAssignment(2, [s2]),
			];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'same_name_separate',
				priority: 1,
				studentIds: [],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(0);
		});
	});

	describe('multiple rules', () => {
		it('reports violations from multiple different rules', () => {
			const s1 = createStudent({ id: 'h1', name: '김영희' });
			const s2 = createStudent({ id: 'h2', name: '김영희' });
			const s3 = createStudent({ id: 'h3' });
			const s4 = createStudent({ id: 'h4' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [s1, s2, s3, s4]),
				makeAssignment(2, []),
			];

			const noTogetherRule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: ['h3', 'h4'],
				label: 'test-no-together',
			};

			const sameNameRule: PlacementRule = {
				id: 'r2',
				type: 'same_name_separate',
				priority: 2,
				studentIds: [],
				label: 'test-same-name',
			};

			const violations = validateAssignments(assignments, [
				noTogetherRule,
				sameNameRule,
			]);
			expect(violations.length).toBeGreaterThanOrEqual(2);

			const ruleIds = violations.map((v) => v.rule.id);
			expect(ruleIds).toContain('r1');
			expect(ruleIds).toContain('r2');
		});

		it('returns empty array when no violations exist', () => {
			const s1 = createStudent({ id: 'i1', name: '가' });
			const s2 = createStudent({ id: 'i2', name: '나' });

			const assignments: ClassAssignment[] = [
				makeAssignment(1, [s1]),
				makeAssignment(2, [s2]),
			];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: ['i1', 'i2'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toEqual([]);
		});
	});

	describe('edge cases', () => {
		it('skips gracefully when studentIds reference non-existent students', () => {
			const s1 = createStudent({ id: 'j1' });

			const assignments: ClassAssignment[] = [makeAssignment(1, [s1])];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: ['j1', 'nonexistent-id'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(0);
		});

		it('handles separate_1_to_n with non-existent anchor gracefully', () => {
			const s1 = createStudent({ id: 'k1' });

			const assignments: ClassAssignment[] = [makeAssignment(1, [s1])];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['nonexistent', 'k1'],
				label: 'test',
			};

			const violations = validateAssignments(assignments, [rule]);
			expect(violations).toHaveLength(0);
		});
	});
});
