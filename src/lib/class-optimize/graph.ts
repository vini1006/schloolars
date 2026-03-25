import type { PlacementRule, Student } from './types';

/**
 * Edge metadata containing the rules that created this edge.
 */
interface EdgeInfo {
	/** Rule IDs that created this edge */
	ruleIds: string[];
	/** Minimum priority among all rules (lower = higher priority) */
	minPriority: number;
}

/**
 * Constraint graph where vertices are students and edges represent
 * constraints that two students cannot be in the same class.
 */
export class ConstraintGraph {
	/** Adjacency list: studentId -> Map of neighborId -> EdgeInfo */
	private adjacency: Map<string, Map<string, EdgeInfo>> = new Map();
	/** Map of studentId to Student object */
	private students: Map<string, Student> = new Map();
	/** Map of rule ID to rule for quick lookup */
	private rules: Map<string, PlacementRule> = new Map();

	/**
	 * Add a student vertex to the graph.
	 */
	addStudent(student: Student): void {
		this.students.set(student.id, student);
		if (!this.adjacency.has(student.id)) {
			this.adjacency.set(student.id, new Map());
		}
	}

	/**
	 * Add an edge between two students (they cannot be in the same class).
	 * If the edge already exists, adds the rule to the existing edge.
	 */
	addEdge(studentId1: string, studentId2: string, rule: PlacementRule): void {
		if (!this.adjacency.has(studentId1)) {
			this.adjacency.set(studentId1, new Map());
		}
		if (!this.adjacency.has(studentId2)) {
			this.adjacency.set(studentId2, new Map());
		}

		const neighbors1 = this.adjacency.get(studentId1)!;
		const neighbors2 = this.adjacency.get(studentId2)!;

		// Store rule for lookup
		this.rules.set(rule.id, rule);

		// Update or create edge info for both directions
		const updateEdge = (existing: EdgeInfo | undefined): EdgeInfo => {
			if (!existing) {
				return {
					ruleIds: [rule.id],
					minPriority: rule.priority,
				};
			}
			return {
				ruleIds: [...existing.ruleIds, rule.id],
				minPriority: Math.min(existing.minPriority, rule.priority),
			};
		};

		neighbors1.set(studentId2, updateEdge(neighbors1.get(studentId2)));
		neighbors2.set(studentId1, updateEdge(neighbors2.get(studentId1)));
	}

	/**
	 * Get the neighbors (constrained students) of a given student.
	 */
	getNeighbors(studentId: string): Set<string> {
		const neighborMap = this.adjacency.get(studentId);
		if (!neighborMap) return new Set();
		return new Set(neighborMap.keys());
	}

	/**
	 * Get edge info for a specific neighbor relationship.
	 */
	getEdgeInfo(studentId: string, neighborId: string): EdgeInfo | undefined {
		return this.adjacency.get(studentId)?.get(neighborId);
	}

	/**
	 * Get the degree (number of constraints) of a student.
	 */
	getDegree(studentId: string): number {
		return this.getNeighbors(studentId).size;
	}

	/**
	 * Get the weighted degree of a student (sum of inverse priorities).
	 * Higher priority rules contribute more to the degree.
	 */
	getWeightedDegree(studentId: string): number {
		const neighborMap = this.adjacency.get(studentId);
		if (!neighborMap) return 0;

		let weightedDegree = 0;
		for (const edgeInfo of neighborMap.values()) {
			// Higher weight for lower priority numbers (higher priority rules)
			weightedDegree += 1000 / (edgeInfo.minPriority + 1);
		}
		return weightedDegree;
	}

	/**
	 * Get all students in the graph.
	 */
	getAllStudents(): Student[] {
		return Array.from(this.students.values());
	}

	/**
	 * Get a student by ID.
	 */
	getStudent(studentId: string): Student | undefined {
		return this.students.get(studentId);
	}

	/**
	 * Get a rule by ID.
	 */
	getRule(ruleId: string): PlacementRule | undefined {
		return this.rules.get(ruleId);
	}

	/**
	 * Get all rules in the graph.
	 */
	getAllRules(): PlacementRule[] {
		return Array.from(this.rules.values());
	}

	/**
	 * Calculate the total violation cost for assigning a student to a color.
	 * Returns the sum of inverse priorities of violated rules.
	 *
	 * Uses inverse priority formula: 1000 / (priority + 1)
	 * This ensures high-priority rules (lower priority numbers) have higher violation costs:
	 * - Priority 0 (same_name_separate) → cost = 1000 (maximum)
	 * - Priority 1 → cost = 500
	 * - Priority 5 → cost = 166
	 * - Priority 10 → cost = 90
	 */
	getViolationCost(
		studentId: string,
		color: number,
		colors: Map<string, number>,
	): number {
		const neighborMap = this.adjacency.get(studentId);
		if (!neighborMap) return 0;

		let violationCost = 0;
		for (const [neighborId, edgeInfo] of neighborMap) {
			const neighborColor = colors.get(neighborId);
			if (neighborColor === color) {
				// Violation! Add inverse priority cost (higher priority = higher cost)
				violationCost += 1000 / (edgeInfo.minPriority + 1);
			}
		}
		return violationCost;
	}

	/**
	 * Build a constraint graph from a list of students and rules.
	 */
	static fromRules(
		students: Student[],
		rules: PlacementRule[],
	): ConstraintGraph {
		const graph = new ConstraintGraph();

		// Add all students as vertices
		for (const student of students) {
			graph.addStudent(student);
		}

		// Add edges based on rules
		for (const rule of rules) {
			switch (rule.type) {
				case 'no_together':
					addNoTogetherEdges(graph, rule.studentIds, rule);
					break;
				case 'separate_1_to_n':
					addSeparate1ToNEdges(graph, rule.studentIds, rule);
					break;
				case 'same_name_separate':
					addSameNameSeparateEdges(graph, students, rule);
					break;
			}
		}

		return graph;
	}
}

/**
 * Add edges so that all students in the list are in different classes.
 * Creates a complete subgraph (clique) among all specified students.
 */
function addNoTogetherEdges(
	graph: ConstraintGraph,
	studentIds: string[],
	rule: PlacementRule,
): void {
	for (let i = 0; i < studentIds.length; i++) {
		for (let j = i + 1; j < studentIds.length; j++) {
			graph.addEdge(studentIds[i], studentIds[j], rule);
		}
	}
}

/**
 * Add edges between the anchor student (first) and all other students.
 * The anchor must be in a different class from all others.
 */
function addSeparate1ToNEdges(
	graph: ConstraintGraph,
	studentIds: string[],
	rule: PlacementRule,
): void {
	if (studentIds.length < 2) return;

	const anchorId = studentIds[0];
	for (let i = 1; i < studentIds.length; i++) {
		graph.addEdge(anchorId, studentIds[i], rule);
	}
}

/**
 * Add edges between all pairs of students with the same name.
 */
function addSameNameSeparateEdges(
	graph: ConstraintGraph,
	students: Student[],
	rule: PlacementRule,
): void {
	const nameMap = new Map<string, string[]>();

	for (const student of students) {
		const list = nameMap.get(student.name) || [];
		list.push(student.id);
		nameMap.set(student.name, list);
	}

	for (const ids of nameMap.values()) {
		if (ids.length > 1) {
			addNoTogetherEdges(graph, ids, rule);
		}
	}
}
