import { describe, expect, it } from 'vitest';
import { ConstraintGraph } from '../graph';
import { greedyColorWelshPowell } from '../graph-coloring';
import type { PlacementRule, Student } from '../types';

describe('greedyColorWelshPowell', () => {
	describe('balance', () => {
		it('should balance class sizes when no constraints exist', () => {
			const students: Student[] = Array.from({ length: 9 }, (_, i) => ({
				id: `s${i}`,
				name: `Student${i}`,
				grade: 1,
				classNum: 1,
				number: i + 1,
				score: 50 + i * 5,
			}));

			const graph = ConstraintGraph.fromRules(students, []);
			const result = greedyColorWelshPowell(graph, 3);

			// Count students per class
			const classSizes = new Map<number, number>();
			for (const [, classNum] of result.colors) {
				classSizes.set(classNum, (classSizes.get(classNum) ?? 0) + 1);
			}

			// All classes should have exactly 3 students
			for (const size of classSizes.values()) {
				expect(size).toBe(3);
			}
		});

		it('should distribute high-scoring students evenly across classes', () => {
			const students: Student[] = [
				{ id: 's1', name: 'A', grade: 1, classNum: 1, number: 1, score: 100 },
				{ id: 's2', name: 'B', grade: 1, classNum: 1, number: 2, score: 95 },
				{ id: 's3', name: 'C', grade: 1, classNum: 1, number: 3, score: 90 },
				{ id: 's4', name: 'D', grade: 1, classNum: 1, number: 4, score: 85 },
				{ id: 's5', name: 'E', grade: 1, classNum: 1, number: 5, score: 80 },
				{ id: 's6', name: 'F', grade: 1, classNum: 1, number: 6, score: 75 },
			];

			const graph = ConstraintGraph.fromRules(students, []);
			const result = greedyColorWelshPowell(graph, 3);

			// Group students by class
			const classScores = new Map<number, number[]>();
			for (const [studentId, classNum] of result.colors) {
				const student = students.find((s) => s.id === studentId)!;
				const scores = classScores.get(classNum) ?? [];
				scores.push(student.score);
				classScores.set(classNum, scores);
			}

			// Calculate average score per class
			const averages = Array.from(classScores.entries()).map(
				([classNum, scores]) => ({
					classNum,
					average: scores.reduce((a, b) => a + b, 0) / scores.length,
				}),
			);

			// Averages should be relatively balanced (within 15 points of each other)
			const maxAvg = Math.max(...averages.map((a) => a.average));
			const minAvg = Math.min(...averages.map((a) => a.average));

			expect(maxAvg - minAvg).toBeLessThan(15);
		});

		it('should handle uneven student counts across classes', () => {
			const students: Student[] = Array.from({ length: 10 }, (_, i) => ({
				id: `s${i}`,
				name: `Student${i}`,
				grade: 1,
				classNum: 1,
				number: i + 1,
				score: 50 + i * 5,
			}));

			const graph = ConstraintGraph.fromRules(students, []);
			const result = greedyColorWelshPowell(graph, 3);

			// Count students per class
			const classSizes = new Map<number, number>();
			for (const [, classNum] of result.colors) {
				classSizes.set(classNum, (classSizes.get(classNum) ?? 0) + 1);
			}

			// Classes should be balanced (4, 3, 3 or similar)
			const sizes = Array.from(classSizes.values()).sort((a, b) => b - a);
			expect(sizes[0]).toBeLessThanOrEqual(4);
			expect(sizes[sizes.length - 1]).toBeGreaterThanOrEqual(3);
		});
	});

	describe('priority enforcement', () => {
		it('should satisfy high-priority rules before low-priority rules', () => {
			const students: Student[] = [
				{ id: 's1', name: 'A', grade: 1, classNum: 1, number: 1, score: 90 },
				{ id: 's2', name: 'B', grade: 1, classNum: 1, number: 2, score: 80 },
				{ id: 's3', name: 'C', grade: 1, classNum: 1, number: 3, score: 70 },
			];

			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'no_together',
					priority: 1,
					studentIds: ['s1', 's2'],
					label: 'High priority',
				},
				{
					id: 'r2',
					type: 'no_together',
					priority: 10,
					studentIds: ['s2', 's3'],
					label: 'Low priority',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);
			const result = greedyColorWelshPowell(graph, 2);

			// High-priority rule should be satisfied (s1 and s2 in different classes)
			expect(result.colors.get('s1')).not.toBe(result.colors.get('s2'));
		});

		it('should satisfy same_name_separate (priority 0) above all other rules', () => {
			const students: Student[] = [
				{ id: 's1', name: 'Kim', grade: 1, classNum: 1, number: 1, score: 90 },
				{ id: 's2', name: 'Kim', grade: 1, classNum: 1, number: 2, score: 80 },
				{ id: 's3', name: 'Lee', grade: 1, classNum: 1, number: 3, score: 70 },
			];

			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'same_name_separate',
					priority: 0,
					studentIds: [],
					label: 'Same name',
				},
				{
					id: 'r2',
					type: 'no_together',
					priority: 5,
					studentIds: ['s1', 's3'],
					label: 'Other rule',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);
			const result = greedyColorWelshPowell(graph, 2);

			// Same-name students MUST be separated (priority 0)
			expect(result.colors.get('s1')).not.toBe(result.colors.get('s2'));
		});
	});

	describe('edge cases', () => {
		it('should handle empty student list', () => {
			const students: Student[] = [];
			const graph = ConstraintGraph.fromRules(students, []);
			const result = greedyColorWelshPowell(graph, 3);

			expect(result.colors.size).toBe(0);
			expect(result.colorCount).toBe(0);
			expect(result.violationCost).toBe(0);
		});

		it('should handle single student', () => {
			const students: Student[] = [
				{ id: 's1', name: 'A', grade: 1, classNum: 1, number: 1, score: 90 },
			];
			const graph = ConstraintGraph.fromRules(students, []);
			const result = greedyColorWelshPowell(graph, 3);

			expect(result.colors.size).toBe(1);
			expect(result.violationCost).toBe(0);
		});

		it('should handle more constrained students than available classes', () => {
			const students: Student[] = [
				{ id: 's1', name: 'A', grade: 1, classNum: 1, number: 1, score: 90 },
				{ id: 's2', name: 'B', grade: 1, classNum: 1, number: 2, score: 80 },
				{ id: 's3', name: 'C', grade: 1, classNum: 1, number: 3, score: 70 },
			];

			// All three must be separate, but only 2 classes available
			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'no_together',
					priority: 1,
					studentIds: ['s1', 's2', 's3'],
					label: 'All separate',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);
			const result = greedyColorWelshPowell(graph, 2);

			// Some violation must occur
			expect(result.violationCost).toBeGreaterThan(0);
		});
	});
});
