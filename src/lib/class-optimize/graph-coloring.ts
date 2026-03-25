import { ConstraintGraph } from './graph';
import type { Student } from './types';

/**
 * Result of graph coloring: maps each student ID to a color (class number).
 */
export interface ColoringResult {
	/** Map of studentId -> color (1-indexed class number) */
	colors: Map<string, number>;
	/** Number of colors used */
	colorCount: number;
	/** Total violation cost (sum of priorities of violated rules) */
	violationCost: number;
}

/**
 * Greedy graph coloring with priority-weighted Welsh-Powell heuristic.
 * Orders vertices by weighted degree (higher priority rules contribute more),
 * then assigns the color that minimizes violation cost.
 */
export function greedyColorWelshPowell(
	graph: ConstraintGraph,
	maxColors: number,
): ColoringResult {
	const students = graph.getAllStudents();

	// Sort by weighted degree (higher priority constraints first)
	const sorted = [...students].sort((a, b) => {
		const weightedDegreeA = graph.getWeightedDegree(a.id);
		const weightedDegreeB = graph.getWeightedDegree(b.id);
		// Tie-break by regular degree
		const degreeA = graph.getDegree(a.id);
		const degreeB = graph.getDegree(b.id);
		if (weightedDegreeA === weightedDegreeB) {
			if (degreeA === degreeB) {
				return b.score - a.score;
			}
			return degreeB - degreeA;
		}
		return weightedDegreeB - weightedDegreeA;
	});

	const colors = new Map<string, number>();
	const colorStudents = new Map<number, Student[]>();
	const colorSums = new Map<number, number>();

	// Initialize color tracking
	for (let c = 1; c <= maxColors; c++) {
		colorStudents.set(c, []);
		colorSums.set(c, 0);
	}

	for (const student of sorted) {
		const color = findBestColor(
			student,
			graph,
			colors,
			colorStudents,
			colorSums,
			maxColors,
		);
		colors.set(student.id, color);
		colorStudents.get(color)!.push(student);
		colorSums.set(color, colorSums.get(color)! + student.score);
	}

	// Count actual colors used and calculate total violation cost
	const usedColors = new Set(colors.values());
	let totalViolationCost = 0;

	for (const student of students) {
		const studentColor = colors.get(student.id)!;
		totalViolationCost += graph.getViolationCost(
			student.id,
			studentColor,
			colors,
		);
	}

	// Divide by 2 because each violation is counted twice (once for each student)
	totalViolationCost = Math.floor(totalViolationCost / 2);

	return {
		colors,
		colorCount: usedColors.size,
		violationCost: totalViolationCost,
	};
}

/**
 * Find the best color for a student considering:
 * 1. Violation cost (prefer colors that don't violate high-priority rules)
 * 2. Validity (no neighbor has the same color)
 * 3. Balance (prefer colors with fewer students and closer to target average)
 */
function findBestColor(
	student: Student,
	graph: ConstraintGraph,
	colors: Map<string, number>,
	colorStudents: Map<number, Student[]>,
	colorSums: Map<number, number>,
	maxColors: number,
): number {
	// Calculate target students per class for balance
	const totalStudents = graph.getAllStudents().length;
	const targetPerClass = Math.ceil(totalStudents / maxColors);

	// Calculate overall average score for balance reference
	const allStudents = graph.getAllStudents();
	const totalScore = allStudents.reduce((sum, s) => sum + s.score, 0);
	const overallAverage = totalScore / totalStudents;

	// Score each color based on violation cost and balance
	let bestColor = 1;
	let bestScore = Infinity;

	for (let c = 1; c <= maxColors; c++) {
		const studentsInClass = colorStudents.get(c)!;
		const currentSum = colorSums.get(c)!;
		const currentCount = studentsInClass.length;

		// Skip if this would make the class too large
		if (currentCount >= targetPerClass + 1) {
			continue;
		}

		// Calculate violation cost for this color
		const violationCost = graph.getViolationCost(student.id, c, colors);

		// Calculate balance score with multiple factors:
		// 1. Class size priority (prefer underfilled classes)
		const sizePenalty = currentCount * 1000;

		// 2. Score balance (prefer classes where new average is closer to overall average)
		const newSum = currentSum + student.score;
		const newCount = currentCount + 1;
		const newAverage = newSum / newCount;
		const averageDeviation = Math.abs(newAverage - overallAverage);
		const scorePenalty = averageDeviation * 100;

		// Combined score: violation cost is the dominant factor
		const balanceScore = sizePenalty + scorePenalty;
		const totalScore = violationCost * 10000 + balanceScore;

		if (totalScore < bestScore) {
			bestScore = totalScore;
			bestColor = c;
		}
	}

	// If no color was selected (all skipped due to size), pick the one with minimum violation
	if (bestScore === Infinity) {
		bestColor = minimizeViolationOrSize(
			student,
			graph,
			colors,
			colorStudents,
			maxColors,
		);
	}

	return bestColor;
}

/**
 * When all colors would violate size constraints, find the best trade-off
 * between violation cost and class size.
 */
function minimizeViolationOrSize(
	student: Student,
	graph: ConstraintGraph,
	colors: Map<string, number>,
	colorStudents: Map<number, Student[]>,
	maxColors: number,
): number {
	let bestColor = 1;
	let bestScore = Infinity;

	for (let c = 1; c <= maxColors; c++) {
		const violationCost = graph.getViolationCost(student.id, c, colors);
		const currentCount = colorStudents.get(c)!.length;

		// Score: violation cost dominates, but size is also considered
		const score = violationCost * 10000 + currentCount;

		if (score < bestScore) {
			bestScore = score;
			bestColor = c;
		}
	}

	return bestColor;
}
