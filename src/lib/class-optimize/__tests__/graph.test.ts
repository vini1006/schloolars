import { describe, expect, it } from 'vitest';
import { ConstraintGraph } from '../graph';
import type { PlacementRule, Student } from '../types';

describe('ConstraintGraph', () => {
	describe('getViolationCost', () => {
		it('should assign higher cost to violations of high-priority rules', () => {
			const students: Student[] = [
				{
					id: 's1',
					name: 'Alice',
					grade: 1,
					classNum: 1,
					number: 1,
					score: 90,
				},
				{ id: 's2', name: 'Bob', grade: 1, classNum: 1, number: 2, score: 80 },
				{
					id: 's3',
					name: 'Charlie',
					grade: 1,
					classNum: 1,
					number: 3,
					score: 70,
				},
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

			// Assign s1 and s2 to same class (violates high-priority rule)
			const colors1 = new Map([
				['s1', 1],
				['s2', 1],
				['s3', 2],
			]);

			// Assign s2 and s3 to same class (violates low-priority rule)
			const colors2 = new Map([
				['s1', 1],
				['s2', 2],
				['s3', 2],
			]);

			const cost1 = graph.getViolationCost('s2', 1, colors1);
			const cost2 = graph.getViolationCost('s3', 2, colors2);

			// High priority rule (priority=1) should have HIGHER cost than low priority (priority=10)
			expect(cost1).toBeGreaterThan(cost2);
		});

		it('should assign maximum cost to priority 0 rules (same_name_separate)', () => {
			const students: Student[] = [
				{ id: 's1', name: 'Kim', grade: 1, classNum: 1, number: 1, score: 90 },
				{ id: 's2', name: 'Kim', grade: 1, classNum: 1, number: 2, score: 80 },
			];

			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'same_name_separate',
					priority: 0,
					studentIds: [],
					label: 'Same name',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);

			// Both Kims in same class (violates priority 0 rule)
			const colors = new Map([
				['s1', 1],
				['s2', 1],
			]);

			const cost = graph.getViolationCost('s2', 1, colors);

			// Priority 0 should produce maximum cost (1000 / (0 + 1) = 1000)
			expect(cost).toBe(1000);
		});

		it('should accumulate costs for multiple violations', () => {
			const students: Student[] = [
				{
					id: 's1',
					name: 'Alice',
					grade: 1,
					classNum: 1,
					number: 1,
					score: 90,
				},
				{ id: 's2', name: 'Bob', grade: 1, classNum: 1, number: 2, score: 80 },
				{
					id: 's3',
					name: 'Charlie',
					grade: 1,
					classNum: 1,
					number: 3,
					score: 70,
				},
			];

			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'no_together',
					priority: 1,
					studentIds: ['s1', 's3'],
					label: 'Rule 1',
				},
				{
					id: 'r2',
					type: 'no_together',
					priority: 2,
					studentIds: ['s2', 's3'],
					label: 'Rule 2',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);

			// All three students in same class (violates both rules for s3)
			const colors = new Map([
				['s1', 1],
				['s2', 1],
				['s3', 1],
			]);

			const cost = graph.getViolationCost('s3', 1, colors);

			// Cost should be sum of both inverse priorities
			expect(cost).toBeGreaterThan(0);
		});

		it('should return 0 when no rules are violated', () => {
			const students: Student[] = [
				{
					id: 's1',
					name: 'Alice',
					grade: 1,
					classNum: 1,
					number: 1,
					score: 90,
				},
				{ id: 's2', name: 'Bob', grade: 1, classNum: 1, number: 2, score: 80 },
			];

			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'no_together',
					priority: 1,
					studentIds: ['s1', 's2'],
					label: 'Rule 1',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);

			// Students in different classes (no violation)
			const colors = new Map([
				['s1', 1],
				['s2', 2],
			]);

			const cost = graph.getViolationCost('s1', 1, colors);

			expect(cost).toBe(0);
		});

		it('should handle multiple rules on same edge using minPriority', () => {
			const students: Student[] = [
				{
					id: 's1',
					name: 'Alice',
					grade: 1,
					classNum: 1,
					number: 1,
					score: 90,
				},
				{ id: 's2', name: 'Bob', grade: 1, classNum: 1, number: 2, score: 80 },
			];

			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'no_together',
					priority: 5,
					studentIds: ['s1', 's2'],
					label: 'Rule 1',
				},
				{
					id: 'r2',
					type: 'no_together',
					priority: 2,
					studentIds: ['s1', 's2'],
					label: 'Rule 2',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);

			// Both students in same class
			const colors = new Map([
				['s1', 1],
				['s2', 1],
			]);

			const cost = graph.getViolationCost('s2', 1, colors);

			// Should use minPriority (2), not sum: 1000 / (2 + 1) = 333
			expect(cost).toBe(333);
		});
	});

	describe('fromRules', () => {
		it('should build graph with no_together rule (clique)', () => {
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
					studentIds: ['s1', 's2', 's3'],
					label: 'All separate',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);

			// Each student should have 2 neighbors (complete graph)
			expect(graph.getDegree('s1')).toBe(2);
			expect(graph.getDegree('s2')).toBe(2);
			expect(graph.getDegree('s3')).toBe(2);
		});

		it('should build graph with separate_1_to_n rule (star)', () => {
			const students: Student[] = [
				{ id: 's1', name: 'A', grade: 1, classNum: 1, number: 1, score: 90 },
				{ id: 's2', name: 'B', grade: 1, classNum: 1, number: 2, score: 80 },
				{ id: 's3', name: 'C', grade: 1, classNum: 1, number: 3, score: 70 },
			];

			const rules: PlacementRule[] = [
				{
					id: 'r1',
					type: 'separate_1_to_n',
					priority: 1,
					studentIds: ['s1', 's2', 's3'],
					label: 'Anchor s1',
				},
			];

			const graph = ConstraintGraph.fromRules(students, rules);

			// Anchor (s1) should have 2 neighbors, others should have 1
			expect(graph.getDegree('s1')).toBe(2);
			expect(graph.getDegree('s2')).toBe(1);
			expect(graph.getDegree('s3')).toBe(1);
		});

		it('should build graph with same_name_separate rule', () => {
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
			];

			const graph = ConstraintGraph.fromRules(students, rules);

			// Both Kims should be connected, Lee should have no neighbors
			expect(graph.getDegree('s1')).toBe(1);
			expect(graph.getDegree('s2')).toBe(1);
			expect(graph.getDegree('s3')).toBe(0);
		});
	});
});
