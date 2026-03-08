import type { ClassAssignment, PlacementRule, Student } from './types';

export function optimizeClasses(
	students: Student[],
	targetClassCount: number,
	rules: PlacementRule[],
): ClassAssignment[] {
	const sorted = [...students].sort((a, b) => b.score - a.score);
	const classes: Student[][] = Array.from(
		{ length: targetClassCount },
		() => [],
	);

	// Snake draft: distribute students evenly by score
	for (let i = 0; i < sorted.length; i++) {
		const round = Math.floor(i / targetClassCount);
		const pos = i % targetClassCount;
		const classIdx = round % 2 === 0 ? pos : targetClassCount - 1 - pos;
		classes[classIdx].push(sorted[i]);
	}

	const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

	for (const rule of sortedRules) {
		applyRule(classes, rule, targetClassCount);
	}

	return classes.map((students, idx) => ({
		classNum: idx + 1,
		students,
		averageScore: calcAverage(students),
	}));
}

function applyRule(
	classes: Student[][],
	rule: PlacementRule,
	classCount: number,
): void {
	switch (rule.type) {
		case 'no_together':
			applyNoTogether(classes, rule.studentIds, classCount);
			break;
		case 'separate_1_to_n':
			applySeparate1ToN(classes, rule.studentIds, classCount);
			break;
		case 'same_name_separate':
			applySameNameSeparate(classes, classCount);
			break;
	}
}

/**
 * Ensures none of the specified students end up in the same class.
 * When conflicts are found, moves conflicting students to the class
 * where swapping causes the least disruption to score balance.
 */
function applyNoTogether(
	classes: Student[][],
	studentIds: string[],
	classCount: number,
): void {
	const idSet = new Set(studentIds);

	for (let ci = 0; ci < classCount; ci++) {
		const inClass = classes[ci].filter((s) => idSet.has(s.id));
		if (inClass.length <= 1) continue;

		// Keep the first one, try to move the rest
		for (let k = 1; k < inClass.length; k++) {
			trySwapToAnotherClass(classes, ci, inClass[k], (targetIdx) => {
				return !classes[targetIdx].some((s) => idSet.has(s.id));
			});
		}
	}
}

/**
 * studentIds[0] is the anchor; all others must be in different classes from anchor.
 */
function applySeparate1ToN(
	classes: Student[][],
	studentIds: string[],
	classCount: number,
): void {
	if (studentIds.length < 2) return;

	const anchorId = studentIds[0];
	const separateIds = new Set(studentIds.slice(1));

	let anchorClassIdx = -1;
	for (let ci = 0; ci < classCount; ci++) {
		if (classes[ci].some((s) => s.id === anchorId)) {
			anchorClassIdx = ci;
			break;
		}
	}
	if (anchorClassIdx === -1) return;

	const conflicting = classes[anchorClassIdx].filter((s) =>
		separateIds.has(s.id),
	);
	for (const student of conflicting) {
		trySwapToAnotherClass(
			classes,
			anchorClassIdx,
			student,
			(targetIdx) => targetIdx !== anchorClassIdx,
		);
	}
}

function applySameNameSeparate(classes: Student[][], classCount: number): void {
	const nameMap = new Map<string, { classIdx: number; student: Student }[]>();

	for (let ci = 0; ci < classCount; ci++) {
		for (const s of classes[ci]) {
			const entries = nameMap.get(s.name) ?? [];
			entries.push({ classIdx: ci, student: s });
			nameMap.set(s.name, entries);
		}
	}

	for (const [, entries] of nameMap) {
		if (entries.length <= 1) continue;

		const classIndices = new Set<number>();
		for (const entry of entries) {
			if (classIndices.has(entry.classIdx)) {
				trySwapToAnotherClass(
					classes,
					entry.classIdx,
					entry.student,
					(targetIdx) => !classIndices.has(targetIdx),
				);
			}
			classIndices.add(entry.classIdx);
		}
	}
}

/**
 * Attempts to swap a student from sourceClassIdx to another class.
 * Picks the swap that minimizes score variance across all classes.
 * The `isValidTarget` predicate gates which target classes are acceptable.
 */
function trySwapToAnotherClass(
	classes: Student[][],
	sourceClassIdx: number,
	student: Student,
	isValidTarget: (targetClassIdx: number) => boolean,
): boolean {
	let bestSwap: { targetClass: number; targetStudentIdx: number } | null = null;
	let bestVariance = Infinity;

	for (let ti = 0; ti < classes.length; ti++) {
		if (ti === sourceClassIdx || !isValidTarget(ti)) continue;

		for (let si = 0; si < classes[ti].length; si++) {
			const sourceIdx = classes[sourceClassIdx].indexOf(student);
			if (sourceIdx === -1) continue;

			// Simulate swap
			classes[sourceClassIdx][sourceIdx] = classes[ti][si];
			classes[ti][si] = student;

			const variance = calcScoreVariance(classes);

			// Revert
			classes[ti][si] = classes[sourceClassIdx][sourceIdx];
			classes[sourceClassIdx][sourceIdx] = student;

			if (variance < bestVariance) {
				bestVariance = variance;
				bestSwap = { targetClass: ti, targetStudentIdx: si };
			}
		}
	}

	if (bestSwap) {
		const sourceIdx = classes[sourceClassIdx].indexOf(student);
		const temp = classes[bestSwap.targetClass][bestSwap.targetStudentIdx];
		classes[bestSwap.targetClass][bestSwap.targetStudentIdx] = student;
		classes[sourceClassIdx][sourceIdx] = temp;
		return true;
	}

	return false;
}

function calcAverage(students: Student[]): number {
	if (students.length === 0) return 0;
	return students.reduce((sum, s) => sum + s.score, 0) / students.length;
}

function calcScoreVariance(classes: Student[][]): number {
	const averages = classes.map(calcAverage);
	const mean = averages.reduce((a, b) => a + b, 0) / averages.length;
	return averages.reduce((sum, avg) => sum + (avg - mean) ** 2, 0);
}
