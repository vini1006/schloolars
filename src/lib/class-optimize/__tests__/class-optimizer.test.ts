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
