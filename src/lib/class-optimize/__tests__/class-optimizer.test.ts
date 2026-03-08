/// <reference types="node" />

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { optimizeClasses } from '../class-optimizer';
import type { ClassAssignment, PlacementRule, Student } from '../types';

const TARGET_CLASS_COUNT = 6;

function loadStudentsFromExcel(): Student[] {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const filePath = resolve(__dirname, '../../../../samples/2-merged.xlsx');
	const workbook = XLSX.readFile(filePath);
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

	const headers = (rows[0] as unknown[]).map((h) => String(h).trim());
	const colIdx = {
		name: headers.indexOf('이름'),
		grade: headers.indexOf('학년'),
		classNum: headers.indexOf('반'),
		number: headers.indexOf('번호'),
		score: headers.indexOf('성적'),
	};

	const students: Student[] = [];
	for (let i = 1; i < rows.length; i++) {
		const row = rows[i] as unknown[];
		if (!row || row.length === 0) continue;

		const name = String(row[colIdx.name] ?? '').trim();
		const grade = Number(row[colIdx.grade]);
		const classNum = Number(row[colIdx.classNum]);
		const number = Number(row[colIdx.number]);
		const score = Number(row[colIdx.score]);

		if (!name || Number.isNaN(grade) || Number.isNaN(score)) continue;

		students.push({
			name,
			grade,
			classNum,
			number,
			score,
			id: `${grade}-${classNum}-${number}`,
		});
	}

	return students;
}

function findStudentClass(
	assignments: ClassAssignment[],
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

describe('optimizeClasses (real data)', () => {
	const students = loadStudentsFromExcel();

	describe('snake draft distribution', () => {
		it('distributes 137 students across 6 classes with max difference of 1', () => {
			const result = optimizeClasses(students, TARGET_CLASS_COUNT, []);

			expect(result).toHaveLength(TARGET_CLASS_COUNT);
			const sizes = result.map((c) => c.students.length);
			const total = sizes.reduce((a, b) => a + b, 0);
			expect(total).toBe(137);
			expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
		});

		it('produces balanced average scores across 6 classes', () => {
			const result = optimizeClasses(students, TARGET_CLASS_COUNT, []);

			const averages = result.map((c) => c.averageScore);
			const variance = calcVariance(averages);
			expect(variance).toBeLessThan(200);
		});

		it('calculates correct averageScore for each class', () => {
			const result = optimizeClasses(students, TARGET_CLASS_COUNT, []);

			for (const cls of result) {
				const expectedAvg =
					cls.students.reduce((sum, s) => sum + s.score, 0) /
					cls.students.length;
				expect(cls.averageScore).toBeCloseTo(expectedAvg);
			}
		});

		it('assigns classNum 1 through 6', () => {
			const result = optimizeClasses(students, TARGET_CLASS_COUNT, []);
			expect(result.map((c) => c.classNum)).toEqual([1, 2, 3, 4, 5, 6]);
		});
	});

	describe('no_together - 체육 특기자 분반', () => {
		const sportsIds = [
			'1-1-3', // 김민경 (소볼)
			'1-1-18', // 조은진 (육상)
			'1-1-19', // 지예빈 (소볼)
			'1-2-5', // 김수민 (소볼)
			'1-2-8', // 서하람 (육상)
			'1-2-24', // 주하윤 (소볼)
			'1-5-10', // 박윤서 (소볼)
			'1-4-24', // 한서윤 (소볼)
			'1-4-23', // 최희수 (소볼)
		];

		it('distributes 9 체육 특기자 across 6 classes (max 2 per class)', () => {
			const rule: PlacementRule = {
				id: 'sports',
				type: 'no_together',
				priority: 1,
				studentIds: sportsIds,
				label: '체육 특기자 분반',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			const countsPerClass = result.map(
				(cls) => cls.students.filter((s) => sportsIds.includes(s.id)).length,
			);

			expect(Math.max(...countsPerClass)).toBeLessThanOrEqual(2);
			expect(countsPerClass.reduce((a, b) => a + b, 0)).toBe(9);
		});
	});

	describe('no_together - 방송부 분반', () => {
		const broadcastIds = [
			'1-1-8', // 신민서
			'1-2-7', // 배예진
			'1-4-10', // 노윤서
		];

		it('places 3 방송부 students in different classes', () => {
			const rule: PlacementRule = {
				id: 'broadcast',
				type: 'no_together',
				priority: 1,
				studentIds: broadcastIds,
				label: '방송부 분반',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			const classes = broadcastIds.map((id) => findStudentClass(result, id));
			const unique = new Set(classes);
			expect(unique.size).toBe(3);
		});
	});

	describe('no_together - 특수 학생 분반', () => {
		const specialIds = [
			'1-2-4', // 김사랑
			'1-4-6', // 김민경
			'1-3-17', // 전하빈 (뇌전증)
		];

		it('places 3 특수 학생 in different classes', () => {
			const rule: PlacementRule = {
				id: 'special',
				type: 'no_together',
				priority: 1,
				studentIds: specialIds,
				label: '특수 학생 분반',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			const classes = specialIds.map((id) => findStudentClass(result, id));
			const unique = new Set(classes);
			expect(unique.size).toBe(3);
		});
	});

	describe('same_name_separate - 동명이인 분반', () => {
		it('separates all same-name pairs into different classes', () => {
			const rule: PlacementRule = {
				id: 'same-name',
				type: 'same_name_separate',
				priority: 1,
				studentIds: [],
				label: '동명이인 분반',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			const pairs = [
				['1-1-3', '1-4-6'], // 김민경
				['1-1-4', '1-3-5'], // 김지윤
				['1-2-4', '1-5-4'], // 김사랑
				['1-2-15', '1-4-18'], // 이소현
				['1-6-16', '1-3-14'], // 이다은
			];

			for (const [id1, id2] of pairs) {
				const c1 = findStudentClass(result, id1);
				const c2 = findStudentClass(result, id2);
				expect(c1).toBeDefined();
				expect(c2).toBeDefined();
				expect(c1).not.toBe(c2);
			}
		});
	});

	describe('separate_1_to_n - 학폭 분반', () => {
		it('separates 김라희 from 안시온', () => {
			const rule: PlacementRule = {
				id: 'bullying-1',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['1-1-2', '1-2-12'], // 김라희 <-> 안시온
				label: '학폭 - 김라희 <-> 안시온',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			expect(findStudentClass(result, '1-1-2')).not.toBe(
				findStudentClass(result, '1-2-12'),
			);
		});

		it('separates 문소연 from 이소현 and 윤가온', () => {
			const rule: PlacementRule = {
				id: 'bullying-2',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['1-1-5', '1-2-15', '1-3-12'], // 문소연 <-> 이소현, 윤가온
				label: '학폭 - 문소연 <-> 이소현, 윤가온',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);
			const anchorClass = findStudentClass(result, '1-1-5');

			expect(findStudentClass(result, '1-2-15')).not.toBe(anchorClass);
			expect(findStudentClass(result, '1-3-12')).not.toBe(anchorClass);
		});

		it('separates 이가온 from 송예린, 정은서, 방서은', () => {
			const rule: PlacementRule = {
				id: 'bullying-3',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: [
					'1-2-14', // 이가온 (anchor)
					'1-2-9', // 송예린
					'1-2-21', // 정은서
					'1-2-6', // 방서은
				],
				label: '학폭 - 이가온 <-> 송예린, 정은서, 방서은',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);
			const anchorClass = findStudentClass(result, '1-2-14');

			expect(findStudentClass(result, '1-2-9')).not.toBe(anchorClass);
			expect(findStudentClass(result, '1-2-21')).not.toBe(anchorClass);
			expect(findStudentClass(result, '1-2-6')).not.toBe(anchorClass);
		});

		it('separates 정유빈 from 배예진', () => {
			const rule: PlacementRule = {
				id: 'bullying-4',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['1-3-19', '1-2-7'], // 정유빈 <-> 배예진
				label: '학폭 - 정유빈 <-> 배예진',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			expect(findStudentClass(result, '1-3-19')).not.toBe(
				findStudentClass(result, '1-2-7'),
			);
		});

		it('separates 조미소 from 11 students', () => {
			const rule: PlacementRule = {
				id: 'bullying-5',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: [
					'1-4-21', // 조미소 (anchor)
					'1-4-9', // 김예은
					'1-4-10', // 노윤서
					'1-4-13', // 박세온
					'1-4-12', // 박서연
					'1-4-14', // 박주언
					'1-4-15', // 방혜린
					'1-4-16', // 안마리아
					'1-4-18', // 이소현
					'1-4-20', // 이하은
					'1-4-22', // 조서하
					'1-4-24', // 한서윤
				],
				label: '학폭 - 조미소 <-> 11명',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);
			const anchorClass = findStudentClass(result, '1-4-21');

			const separateIds = [
				'1-4-9',
				'1-4-10',
				'1-4-13',
				'1-4-12',
				'1-4-14',
				'1-4-15',
				'1-4-16',
				'1-4-18',
				'1-4-20',
				'1-4-22',
				'1-4-24',
			];

			for (const id of separateIds) {
				expect(findStudentClass(result, id)).not.toBe(anchorClass);
			}
		});
	});

	describe('no_together - 담임 개별 요청 분반', () => {
		const teacherRequestIds = [
			'1-2-15', // 이소현 (2반)
			'1-3-12', // 윤가온 (3반)
			'1-4-17', // 유수연 (4반)
			'1-5-5', // 김성윤 (5반)
			'1-6-6', // 박수현 (6반)
		];

		it('distributes 5 담임 요청 students across different classes', () => {
			const rule: PlacementRule = {
				id: 'teacher-individual',
				type: 'no_together',
				priority: 1,
				studentIds: teacherRequestIds,
				label: '담임 개별 요청 분반',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			const classes = teacherRequestIds.map((id) =>
				findStudentClass(result, id),
			);
			const unique = new Set(classes);
			expect(unique.size).toBe(5);
		});
	});

	describe('separate_1_to_n - 담임 요청 (정소연 <-> 이소현)', () => {
		it('separates 정소연 from 이소현 (괴롭힘 사유)', () => {
			const rule: PlacementRule = {
				id: 'teacher-request',
				type: 'separate_1_to_n',
				priority: 1,
				studentIds: ['1-2-20', '1-2-15'], // 정소연 <-> 이소현
				label: '담임 요청 - 정소연 <-> 이소현',
			};

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, [rule]);

			expect(findStudentClass(result, '1-2-20')).not.toBe(
				findStudentClass(result, '1-2-15'),
			);
		});
	});

	describe('combined rules integration', () => {
		it('satisfies all placement rules simultaneously', () => {
			const sportsIds = [
				'1-1-3',
				'1-1-18',
				'1-1-19',
				'1-2-5',
				'1-2-8',
				'1-2-24',
				'1-5-10',
				'1-4-24',
				'1-4-23',
			];

			const rules: PlacementRule[] = [
				{
					id: 'sports',
					type: 'no_together',
					priority: 1,
					studentIds: sportsIds,
					label: '체육 특기자 분반',
				},
				{
					id: 'broadcast',
					type: 'no_together',
					priority: 2,
					studentIds: ['1-1-8', '1-2-7', '1-4-10'],
					label: '방송부 분반',
				},
				{
					id: 'special',
					type: 'no_together',
					priority: 3,
					studentIds: ['1-2-4', '1-4-6', '1-3-17'],
					label: '특수 학생 분반',
				},
				{
					id: 'same-name',
					type: 'same_name_separate',
					priority: 4,
					studentIds: [],
					label: '동명이인 분반',
				},
				{
					id: 'bullying-1',
					type: 'separate_1_to_n',
					priority: 5,
					studentIds: ['1-1-2', '1-2-12'],
					label: '학폭 - 김라희 <-> 안시온',
				},
				{
					id: 'bullying-2',
					type: 'separate_1_to_n',
					priority: 6,
					studentIds: ['1-1-5', '1-2-15', '1-3-12'],
					label: '학폭 - 문소연 <-> 이소현, 윤가온',
				},
				{
					id: 'bullying-3',
					type: 'separate_1_to_n',
					priority: 7,
					studentIds: ['1-2-14', '1-2-9', '1-2-21', '1-2-6'],
					label: '학폭 - 이가온 <-> 송예린, 정은서, 방서은',
				},
				{
					id: 'bullying-4',
					type: 'separate_1_to_n',
					priority: 8,
					studentIds: ['1-3-19', '1-2-7'],
					label: '학폭 - 정유빈 <-> 배예진',
				},
				{
					id: 'bullying-5',
					type: 'separate_1_to_n',
					priority: 9,
					studentIds: [
						'1-4-21',
						'1-4-9',
						'1-4-10',
						'1-4-13',
						'1-4-12',
						'1-4-14',
						'1-4-15',
						'1-4-16',
						'1-4-18',
						'1-4-20',
						'1-4-22',
						'1-4-24',
					],
					label: '학폭 - 조미소 <-> 11명',
				},
				{
					id: 'teacher-individual',
					type: 'no_together',
					priority: 10,
					studentIds: ['1-2-15', '1-3-12', '1-4-17', '1-5-5', '1-6-6'],
					label: '담임 개별 요청 분반',
				},
				{
					id: 'teacher-request',
					type: 'separate_1_to_n',
					priority: 11,
					studentIds: ['1-2-20', '1-2-15'],
					label: '담임 요청 - 정소연 <-> 이소현',
				},
			];

			const result = optimizeClasses(students, TARGET_CLASS_COUNT, rules);

			// 체육 특기자: max 2 per class
			const sportsCounts = result.map(
				(cls) => cls.students.filter((s) => sportsIds.includes(s.id)).length,
			);
			expect(Math.max(...sportsCounts)).toBeLessThanOrEqual(2);

			// 방송부: all in different classes
			const broadcastClasses = ['1-1-8', '1-2-7', '1-4-10'].map((id) =>
				findStudentClass(result, id),
			);
			expect(new Set(broadcastClasses).size).toBe(3);

			// 특수 학생: all in different classes
			const specialClasses = ['1-2-4', '1-4-6', '1-3-17'].map((id) =>
				findStudentClass(result, id),
			);
			expect(new Set(specialClasses).size).toBe(3);

			// 동명이인: each pair in different classes
			const namePairs = [
				['1-1-3', '1-4-6'],
				['1-1-4', '1-3-5'],
				['1-2-4', '1-5-4'],
				['1-2-15', '1-4-18'],
				['1-6-16', '1-3-14'],
			];
			for (const [id1, id2] of namePairs) {
				expect(findStudentClass(result, id1)).not.toBe(
					findStudentClass(result, id2),
				);
			}

			// 학폭: anchor separated from targets
			expect(findStudentClass(result, '1-1-2')).not.toBe(
				findStudentClass(result, '1-2-12'),
			);

			const munClass = findStudentClass(result, '1-1-5');
			expect(findStudentClass(result, '1-2-15')).not.toBe(munClass);
			expect(findStudentClass(result, '1-3-12')).not.toBe(munClass);

			const igaonClass = findStudentClass(result, '1-2-14');
			for (const id of ['1-2-9', '1-2-21', '1-2-6']) {
				expect(findStudentClass(result, id)).not.toBe(igaonClass);
			}

			expect(findStudentClass(result, '1-3-19')).not.toBe(
				findStudentClass(result, '1-2-7'),
			);

			const jomisoClass = findStudentClass(result, '1-4-21');
			for (const id of [
				'1-4-9',
				'1-4-10',
				'1-4-13',
				'1-4-12',
				'1-4-14',
				'1-4-15',
				'1-4-16',
				'1-4-18',
				'1-4-20',
				'1-4-22',
				'1-4-24',
			]) {
				expect(findStudentClass(result, id)).not.toBe(jomisoClass);
			}

			// 정소연 <-> 이소현
			expect(findStudentClass(result, '1-2-20')).not.toBe(
				findStudentClass(result, '1-2-15'),
			);

			// Score balance remains reasonable
			const averages = result.map((c) => c.averageScore);
			const variance = calcVariance(averages);
			expect(variance).toBeLessThan(500);
		});
	});

	describe('edge cases', () => {
		it('returns empty assignments for empty student list', () => {
			const result = optimizeClasses([], TARGET_CLASS_COUNT, []);
			expect(result).toHaveLength(TARGET_CLASS_COUNT);
			for (const cls of result) {
				expect(cls.students).toHaveLength(0);
				expect(cls.averageScore).toBe(0);
			}
		});

		it('assigns a single student to the first class', () => {
			const single = students[0];
			const result = optimizeClasses([single], TARGET_CLASS_COUNT, []);

			expect(result).toHaveLength(TARGET_CLASS_COUNT);
			expect(result[0].students).toHaveLength(1);
			expect(result[0].students[0].id).toBe(single.id);
			for (let i = 1; i < TARGET_CLASS_COUNT; i++) {
				expect(result[i].students).toHaveLength(0);
			}
		});
	});
});
