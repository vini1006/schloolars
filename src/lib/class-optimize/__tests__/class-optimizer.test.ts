import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';
import { optimizeClasses } from '../class-optimizer';
import type { PlacementRule, Student } from '../types';

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

function createStudents(
	count: number,
	overrides?: Partial<Student>,
): Student[] {
	return Array.from({ length: count }, () => createStudent(overrides));
}

function findStudentClass(
	assignments: { classNum: number; students: Student[] }[],
	studentId: string,
): number | undefined {
	for (const a of assignments) {
		if (a.students.some((s) => s.id === studentId)) return a.classNum;
	}
	return undefined;
}

function calcVariance(values: number[]): number {
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

describe('optimizeClasses', () => {
	describe('snake draft distribution', () => {
		it('distributes students evenly when count is divisible by class count', () => {
			const students = createStudents(12);
			const result = optimizeClasses(students, 3, []);

			expect(result).toHaveLength(3);
			for (const cls of result) {
				expect(cls.students).toHaveLength(4);
			}
		});

		it('distributes students when count is not evenly divisible', () => {
			const students = createStudents(10);
			const result = optimizeClasses(students, 3, []);

			expect(result).toHaveLength(3);
			const totalStudents = result.reduce(
				(sum, c) => sum + c.students.length,
				0,
			);
			expect(totalStudents).toBe(10);

			const sizes = result.map((c) => c.students.length).sort();
			expect(sizes[2] - sizes[0]).toBeLessThanOrEqual(1);
		});

		it('produces balanced average scores across classes', () => {
			const students = createStudents(30);
			const result = optimizeClasses(students, 3, []);

			const averages = result.map((c) => c.averageScore);
			const variance = calcVariance(averages);
			expect(variance).toBeLessThan(100);
		});

		it('calculates correct averageScore for each class', () => {
			const students = createStudents(9);
			const result = optimizeClasses(students, 3, []);

			for (const cls of result) {
				const expectedAvg =
					cls.students.reduce((sum, s) => sum + s.score, 0) /
					cls.students.length;
				expect(cls.averageScore).toBeCloseTo(expectedAvg);
			}
		});

		it('assigns classNum starting from 1', () => {
			const students = createStudents(6);
			const result = optimizeClasses(students, 3, []);

			expect(result.map((c) => c.classNum)).toEqual([1, 2, 3]);
		});
	});

	describe('no_together rule', () => {
		it('separates two specified students into different classes', () => {
			const s1 = createStudent({ score: 90 });
			const s2 = createStudent({ score: 89 });
			const others = createStudents(10);
			const allStudents = [s1, s2, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: [s1.id, s2.id],
				label: 'test',
			};

			const result = optimizeClasses(allStudents, 3, [rule]);
			const c1 = findStudentClass(result, s1.id);
			const c2 = findStudentClass(result, s2.id);

			expect(c1).toBeDefined();
			expect(c2).toBeDefined();
			expect(c1).not.toBe(c2);
		});

		it('separates three specified students into different classes', () => {
			const s1 = createStudent({ score: 95 });
			const s2 = createStudent({ score: 94 });
			const s3 = createStudent({ score: 93 });
			const others = createStudents(9);
			const allStudents = [s1, s2, s3, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: [s1.id, s2.id, s3.id],
				label: 'test',
			};

			const result = optimizeClasses(allStudents, 3, [rule]);
			const classes = [s1, s2, s3].map((s) => findStudentClass(result, s.id));
			const unique = new Set(classes);
			expect(unique.size).toBe(3);
		});

		it('distributes students evenly when more students than classes (5 students, 3 classes)', () => {
			const targets = Array.from({ length: 5 }, (_, i) =>
				createStudent({ score: 90 - i, id: `target-${i}` }),
			);
			const others = createStudents(10);
			const allStudents = [...targets, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: targets.map((s) => s.id),
				label: '5 students separated across 3 classes',
			};

			const result = optimizeClasses(allStudents, 3, [rule]);

			// 5 students / 3 classes = max 2 per class
			// Expected distribution: 2, 2, 1
			const countsPerClass = result.map(
				(cls) =>
					cls.students.filter((s) => targets.some((t) => t.id === s.id)).length,
			);

			expect(Math.max(...countsPerClass)).toBe(2);
			expect(countsPerClass.reduce((a, b) => a + b, 0)).toBe(5);
		});

		it('distributes students evenly when more students than classes (7 students, 3 classes)', () => {
			const targets = Array.from({ length: 7 }, (_, i) =>
				createStudent({ score: 90 - i, id: `target7-${i}` }),
			);
			const others = createStudents(8);
			const allStudents = [...targets, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: targets.map((s) => s.id),
				label: '7 students separated across 3 classes',
			};

			const result = optimizeClasses(allStudents, 3, [rule]);

			// 7 students / 3 classes = max 3 per class
			// Expected distribution: 3, 2, 2
			const countsPerClass = result.map(
				(cls) =>
					cls.students.filter((s) => targets.some((t) => t.id === s.id)).length,
			);

			expect(Math.max(...countsPerClass)).toBe(3);
			expect(countsPerClass.reduce((a, b) => a + b, 0)).toBe(7);
		});

		it('distributes students evenly when exactly equal to class count', () => {
			const targets = Array.from({ length: 3 }, (_, i) =>
				createStudent({ score: 90 - i, id: `exact-${i}` }),
			);
			const others = createStudents(9);
			const allStudents = [...targets, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: targets.map((s) => s.id),
				label: '3 students separated across 3 classes',
			};

			const result = optimizeClasses(allStudents, 3, [rule]);

			// 3 students / 3 classes = max 1 per class
			const countsPerClass = result.map(
				(cls) =>
					cls.students.filter((s) => targets.some((t) => t.id === s.id)).length,
			);

			expect(Math.max(...countsPerClass)).toBe(1);
			expect(countsPerClass.reduce((a, b) => a + b, 0)).toBe(3);
		});

		it('distributes 10 students evenly across 4 classes', () => {
			const targets = Array.from({ length: 10 }, (_, i) =>
				createStudent({ score: 90 - i, id: `ten-${i}` }),
			);
			const others = createStudents(6);
			const allStudents = [...targets, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'no_together',
				priority: 1,
				studentIds: targets.map((s) => s.id),
				label: '10 students separated across 4 classes',
			};

			const result = optimizeClasses(allStudents, 4, [rule]);

			// 10 students / 4 classes = max 3 per class
			// Expected distribution: 3, 3, 2, 2
			const countsPerClass = result.map(
				(cls) =>
					cls.students.filter((s) => targets.some((t) => t.id === s.id)).length,
			);

			expect(Math.max(...countsPerClass)).toBe(3);
			expect(countsPerClass.reduce((a, b) => a + b, 0)).toBe(10);
		});
	});

	describe('separate_1_to_n rule', () => {
		it('separates anchor student from all N specified students', () => {
			const anchor = createStudent({ score: 99 });
			const sep1 = createStudent({ score: 98 });
			const sep2 = createStudent({ score: 97 });
			const others = createStudents(9);
			const allStudents = [anchor, sep1, sep2, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: [anchor.id, sep1.id, sep2.id],
				label: 'test',
			};

			const result = optimizeClasses(allStudents, 3, [rule]);
			const anchorClass = findStudentClass(result, anchor.id);

			expect(anchorClass).toBeDefined();
			expect(findStudentClass(result, sep1.id)).not.toBe(anchorClass);
			expect(findStudentClass(result, sep2.id)).not.toBe(anchorClass);
		});

		it('is a no-op when rule has fewer than 2 studentIds', () => {
			const s1 = createStudent({ score: 80 });
			const others = createStudents(8);
			const allStudents = [s1, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: [s1.id],
				label: 'test',
			};

			const withRule = optimizeClasses(allStudents, 3, [rule]);
			const withoutRule = optimizeClasses(allStudents, 3, []);

			expect(withRule).toEqual(withoutRule);
		});
	});

	describe('same_name_separate rule', () => {
		it('places students with identical names in different classes', () => {
			const duplicateName = '홍길동';
			const s1 = createStudent({
				name: duplicateName,
				score: 85,
				grade: 3,
				classNum: 1,
				number: 1,
			});
			const s2 = createStudent({
				name: duplicateName,
				score: 75,
				grade: 3,
				classNum: 2,
				number: 2,
			});
			const others = createStudents(10);
			const allStudents = [s1, s2, ...others];

			const rule: PlacementRule = {
				id: 'r1',
				type: 'same_name_separate',
				priority: 1,
				studentIds: [],
				label: 'test',
			};

			const result = optimizeClasses(allStudents, 3, [rule]);
			const c1 = findStudentClass(result, s1.id);
			const c2 = findStudentClass(result, s2.id);

			expect(c1).toBeDefined();
			expect(c2).toBeDefined();
			expect(c1).not.toBe(c2);
		});
	});

	describe('rule priority', () => {
		it('applies higher-priority rules first', () => {
			const s1 = createStudent({ score: 95 });
			const s2 = createStudent({ score: 94 });
			const s3 = createStudent({ score: 93 });
			const others = createStudents(9);
			const allStudents = [s1, s2, s3, ...others];

			const highPriority: PlacementRule = {
				id: 'r-high',
				type: 'no_together',
				priority: 1,
				studentIds: [s1.id, s2.id],
				label: 'high priority',
			};

			const lowPriority: PlacementRule = {
				id: 'r-low',
				type: 'no_together',
				priority: 10,
				studentIds: [s1.id, s3.id],
				label: 'low priority',
			};

			const result = optimizeClasses(allStudents, 3, [
				lowPriority,
				highPriority,
			]);
			const c1 = findStudentClass(result, s1.id);
			const c2 = findStudentClass(result, s2.id);

			expect(c1).not.toBe(c2);
		});
	});

	describe('rule preservation', () => {
		it('preserves higher priority rule when applying lower priority rule', () => {
			const s1 = createStudent({ score: 100, id: 'p-s1' });
			const s2 = createStudent({ score: 99, id: 'p-s2' });
			const s3 = createStudent({ score: 50, id: 'p-s3' });
			const s4 = createStudent({ score: 49, id: 'p-s4' });
			const others = createStudents(8);
			const allStudents = [s1, s2, s3, s4, ...others];

			const highPriority: PlacementRule = {
				id: 'r-high',
				type: 'no_together',
				priority: 1,
				studentIds: [s1.id, s2.id],
				label: 'high priority - s1, s2 separation',
			};

			const lowPriority: PlacementRule = {
				id: 'r-low',
				type: 'no_together',
				priority: 10,
				studentIds: [s3.id, s4.id],
				label: 'low priority - s3, s4 separation',
			};

			const result = optimizeClasses(allStudents, 3, [
				highPriority,
				lowPriority,
			]);

			const c1 = findStudentClass(result, s1.id);
			const c2 = findStudentClass(result, s2.id);
			const c3 = findStudentClass(result, s3.id);
			const c4 = findStudentClass(result, s4.id);

			expect(c1).not.toBe(c2);
			expect(c3).not.toBe(c4);
		});

		it('preserves multiple previous rules when applying new rule', () => {
			const a = createStudent({ score: 100, id: 'multi-a' });
			const b = createStudent({ score: 99, id: 'multi-b' });
			const c = createStudent({ score: 80, id: 'multi-c' });
			const d = createStudent({ score: 79, id: 'multi-d' });
			const e = createStudent({ score: 50, id: 'multi-e' });
			const f = createStudent({ score: 49, id: 'multi-f' });
			const others = createStudents(12);
			const allStudents = [a, b, c, d, e, f, ...others];

			const rule1: PlacementRule = {
				id: 'rule1',
				type: 'no_together',
				priority: 1,
				studentIds: [a.id, b.id],
				label: 'A, B separation',
			};

			const rule2: PlacementRule = {
				id: 'rule2',
				type: 'no_together',
				priority: 2,
				studentIds: [c.id, d.id],
				label: 'C, D separation',
			};

			const rule3: PlacementRule = {
				id: 'rule3',
				type: 'no_together',
				priority: 3,
				studentIds: [e.id, f.id],
				label: 'E, F separation',
			};

			const result = optimizeClasses(allStudents, 4, [rule1, rule2, rule3]);

			expect(findStudentClass(result, a.id)).not.toBe(
				findStudentClass(result, b.id),
			);
			expect(findStudentClass(result, c.id)).not.toBe(
				findStudentClass(result, d.id),
			);
			expect(findStudentClass(result, e.id)).not.toBe(
				findStudentClass(result, f.id),
			);
		});

		it('falls back to best variance when all swaps violate previous rules', () => {
			const s1 = createStudent({ score: 100, id: 'fb-s1', name: '김철수' });
			const s2 = createStudent({ score: 99, id: 'fb-s2', name: '이영희' });
			const s3 = createStudent({ score: 98, id: 'fb-s3', name: '박민수' });
			const s4 = createStudent({ score: 50, id: 'fb-s4', name: '김철수' });
			const allStudents = [s1, s2, s3, s4];

			const noTogetherRule: PlacementRule = {
				id: 'no-together',
				type: 'no_together',
				priority: 1,
				studentIds: [s1.id, s2.id, s3.id],
				label: 's1, s2, s3 all separate',
			};

			const sameNameRule: PlacementRule = {
				id: 'same-name',
				type: 'same_name_separate',
				priority: 2,
				studentIds: [],
				label: 'separate same names',
			};

			const result = optimizeClasses(allStudents, 3, [
				noTogetherRule,
				sameNameRule,
			]);

			expect(result).toHaveLength(3);
			const totalStudents = result.reduce(
				(sum, cls) => sum + cls.students.length,
				0,
			);
			expect(totalStudents).toBe(4);
		});

		it('preserves no_together rule when applying same_name_separate rule', () => {
			const s1 = createStudent({ score: 100, id: 'nt-s1', name: '김철수' });
			const s2 = createStudent({ score: 99, id: 'nt-s2', name: '이영희' });
			const dup1 = createStudent({ score: 50, id: 'nt-dup1', name: '박민수' });
			const dup2 = createStudent({ score: 49, id: 'nt-dup2', name: '박민수' });
			const others = createStudents(8);
			const allStudents = [s1, s2, dup1, dup2, ...others];

			const noTogetherRule: PlacementRule = {
				id: 'no-together',
				type: 'no_together',
				priority: 1,
				studentIds: [s1.id, s2.id],
				label: 's1, s2 separation',
			};

			const sameNameRule: PlacementRule = {
				id: 'same-name',
				type: 'same_name_separate',
				priority: 2,
				studentIds: [],
				label: 'separate same names',
			};

			const result = optimizeClasses(allStudents, 3, [
				noTogetherRule,
				sameNameRule,
			]);

			expect(findStudentClass(result, s1.id)).not.toBe(
				findStudentClass(result, s2.id),
			);
			expect(findStudentClass(result, dup1.id)).not.toBe(
				findStudentClass(result, dup2.id),
			);
		});

		it('preserves separate_1_to_n rule when applying no_together rule', () => {
			const anchor = createStudent({ score: 100, id: 'sep-anchor' });
			const sep1 = createStudent({ score: 99, id: 'sep-s1' });
			const sep2 = createStudent({ score: 98, id: 'sep-s2' });
			const t1 = createStudent({ score: 50, id: 'sep-t1' });
			const t2 = createStudent({ score: 49, id: 'sep-t2' });
			const others = createStudents(10);
			const allStudents = [anchor, sep1, sep2, t1, t2, ...others];

			const separate1ToNRule: PlacementRule = {
				id: 'sep-1-to-n',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: [anchor.id, sep1.id, sep2.id],
				label: 'anchor separated from sep1, sep2',
			};

			const noTogetherRule: PlacementRule = {
				id: 'no-together',
				type: 'no_together',
				priority: 2,
				studentIds: [t1.id, t2.id],
				label: 't1, t2 separation',
			};

			const result = optimizeClasses(allStudents, 4, [
				separate1ToNRule,
				noTogetherRule,
			]);

			const anchorClass = findStudentClass(result, anchor.id);
			expect(findStudentClass(result, sep1.id)).not.toBe(anchorClass);
			expect(findStudentClass(result, sep2.id)).not.toBe(anchorClass);
			expect(findStudentClass(result, t1.id)).not.toBe(
				findStudentClass(result, t2.id),
			);
		});
	});

	describe('edge cases', () => {
		it('returns empty assignments for empty student list', () => {
			const result = optimizeClasses([], 3, []);
			expect(result).toHaveLength(3);
			for (const cls of result) {
				expect(cls.students).toHaveLength(0);
				expect(cls.averageScore).toBe(0);
			}
		});

		it('assigns a single student to the first class', () => {
			const student = createStudent();
			const result = optimizeClasses([student], 3, []);

			expect(result).toHaveLength(3);
			expect(result[0].students).toHaveLength(1);
			expect(result[0].students[0].id).toBe(student.id);
			expect(result[1].students).toHaveLength(0);
			expect(result[2].students).toHaveLength(0);
		});

		it('handles more classes than students', () => {
			const students = createStudents(2);
			const result = optimizeClasses(students, 5, []);

			expect(result).toHaveLength(5);
			const totalStudents = result.reduce(
				(sum, c) => sum + c.students.length,
				0,
			);
			expect(totalStudents).toBe(2);
		});

		it('produces correct results with no rules (pure snake draft)', () => {
			const students = createStudents(12);
			const result = optimizeClasses(students, 3, []);

			expect(result).toHaveLength(3);
			const totalStudents = result.reduce(
				(sum, c) => sum + c.students.length,
				0,
			);
			expect(totalStudents).toBe(12);
		});
	});
});
