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
	const appliedRules: PlacementRule[] = [];

	for (const rule of sortedRules) {
		applyRule(classes, rule, targetClassCount, appliedRules);
		appliedRules.push(rule);
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
	appliedRules: PlacementRule[],
): void {
	switch (rule.type) {
		case 'no_together':
			applyNoTogether(classes, rule.studentIds, classCount, appliedRules);
			break;
		case 'separate_1_to_n':
			applySeparate1ToN(classes, rule.studentIds, classCount, appliedRules);
			break;
		case 'same_name_separate':
			applySameNameSeparate(classes, classCount, appliedRules);
			break;
	}
}

/**
 * Ensures none of the specified students end up in the same class.
 * When conflicts are found, moves conflicting students to the class
 * where swapping causes the least disruption to score balance.
 *
 * When there are more students than classes, distributes them as evenly
 * as possible (e.g., 7 students across 3 classes → 3, 2, 2).
 */
function applyNoTogether(
	classes: Student[][],
	studentIds: string[],
	classCount: number,
	appliedRules: PlacementRule[],
): void {
	const idSet = new Set(studentIds);

	// Calculate the maximum allowed per class for even distribution
	// e.g., 7 students / 3 classes = ceil(7/3) = 3 max per class
	const maxPerClass = Math.ceil(studentIds.length / classCount);

	// Helper to count how many target students are in each class
	const countInClass = (classIdx: number) =>
		classes[classIdx].filter((s) => idSet.has(s.id)).length;

	// Process classes that exceed the max allowed
	for (let ci = 0; ci < classCount; ci++) {
		const inClass = classes[ci].filter((s) => idSet.has(s.id));
		if (inClass.length <= maxPerClass) continue;

		// Move excess students to classes with fewer target students
		const excess = inClass.length - maxPerClass;
		for (let k = 0; k < excess; k++) {
			const studentToMove = inClass[inClass.length - 1 - k];
			trySwapToAnotherClass(
				classes,
				ci,
				studentToMove,
				(targetIdx) => countInClass(targetIdx) < maxPerClass,
				appliedRules,
			);
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
	appliedRules: PlacementRule[],
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
			appliedRules,
		);
	}
}

function applySameNameSeparate(
	classes: Student[][],
	classCount: number,
	appliedRules: PlacementRule[],
): void {
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
					appliedRules,
				);
			}
			classIndices.add(entry.classIdx);
		}
	}
}

/**
 * Attempts to swap a student from sourceClassIdx to another class.
 * Picks the swap that minimizes score variance across all classes
 * while preserving previously applied rules.
 * The `isValidTarget` predicate gates which target classes are acceptable.
 * If no swap preserves all previous rules, falls back to the best swap ignoring rule preservation.
 */
function trySwapToAnotherClass(
	classes: Student[][],
	sourceClassIdx: number,
	student: Student,
	isValidTarget: (targetClassIdx: number) => boolean,
	appliedRules: PlacementRule[],
): boolean {
	type SwapCandidate = {
		targetClass: number;
		targetStudentIdx: number;
		variance: number;
		preservesRules: boolean;
	};

	const candidates: SwapCandidate[] = [];

	for (let ti = 0; ti < classes.length; ti++) {
		if (ti === sourceClassIdx || !isValidTarget(ti)) continue;

		for (let si = 0; si < classes[ti].length; si++) {
			const sourceIdx = classes[sourceClassIdx].indexOf(student);
			if (sourceIdx === -1) continue;

			// Simulate swap
			classes[sourceClassIdx][sourceIdx] = classes[ti][si];
			classes[ti][si] = student;

			const variance = calcScoreVariance(classes);
			const preservesRules = checkPreviousRulesPreserved(classes, appliedRules);

			// Revert
			classes[ti][si] = classes[sourceClassIdx][sourceIdx];
			classes[sourceClassIdx][sourceIdx] = student;

			candidates.push({
				targetClass: ti,
				targetStudentIdx: si,
				variance,
				preservesRules,
			});
		}
	}

	if (candidates.length === 0) return false;

	// First, try to find a swap that preserves all previous rules
	const preservingCandidates = candidates.filter((c) => c.preservesRules);
	let bestSwap: SwapCandidate | null = null;

	if (preservingCandidates.length > 0) {
		// Pick the one with minimum variance among those that preserve rules
		bestSwap = preservingCandidates.reduce((best, curr) =>
			curr.variance < best.variance ? curr : best,
		);
	} else {
		// All candidates violate previous rules, fall back to best variance
		bestSwap = candidates.reduce((best, curr) =>
			curr.variance < best.variance ? curr : best,
		);
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

/**
 * Checks if all previously applied rules are still satisfied after a swap.
 */
function checkPreviousRulesPreserved(
	classes: Student[][],
	appliedRules: PlacementRule[],
): boolean {
	for (const rule of appliedRules) {
		if (!isRuleSatisfied(classes, rule)) {
			return false;
		}
	}
	return true;
}

/**
 * Checks if a specific rule is satisfied in the current class configuration.
 */
function isRuleSatisfied(classes: Student[][], rule: PlacementRule): boolean {
	switch (rule.type) {
		case 'no_together':
			return isNoTogetherSatisfied(classes, rule.studentIds);
		case 'separate_1_to_n':
			return isSeparate1ToNSatisfied(classes, rule.studentIds);
		case 'same_name_separate':
			return isSameNameSeparateSatisfied(classes);
	}
}

function isNoTogetherSatisfied(
	classes: Student[][],
	studentIds: string[],
): boolean {
	const idSet = new Set(studentIds);
	const classCount = classes.length;

	// Maximum allowed per class for even distribution
	const maxPerClass = Math.ceil(studentIds.length / classCount);

	for (const classStudents of classes) {
		const count = classStudents.filter((s) => idSet.has(s.id)).length;
		if (count > maxPerClass) return false;
	}
	return true;
}

function isSeparate1ToNSatisfied(
	classes: Student[][],
	studentIds: string[],
): boolean {
	if (studentIds.length < 2) return true;

	const anchorId = studentIds[0];
	const separateIds = new Set(studentIds.slice(1));

	for (const classStudents of classes) {
		const hasAnchor = classStudents.some((s) => s.id === anchorId);
		if (!hasAnchor) continue;

		const hasConflict = classStudents.some((s) => separateIds.has(s.id));
		if (hasConflict) return false;
	}
	return true;
}

function isSameNameSeparateSatisfied(classes: Student[][]): boolean {
	for (const classStudents of classes) {
		const nameCount = new Map<string, number>();
		for (const s of classStudents) {
			nameCount.set(s.name, (nameCount.get(s.name) ?? 0) + 1);
		}
		for (const count of nameCount.values()) {
			if (count > 1) return false;
		}
	}
	return true;
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
