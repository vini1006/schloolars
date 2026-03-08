import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PlacementRule, Student } from '@/lib/class-optimize/types';
import { RuleEditor } from './rule-editor';

interface StepRulesProps {
	students: Student[];
	rules: PlacementRule[];
	onRulesChange: (rules: PlacementRule[]) => void;
	onBack: () => void;
	onNext: () => void;
}

export function StepRules({
	students,
	rules,
	onRulesChange,
	onBack,
	onNext,
}: StepRulesProps) {
	const hasSameNameRule = rules.some((r) => r.type === 'same_name_separate');

	function addRule() {
		const newRule: PlacementRule = {
			id: crypto.randomUUID(),
			type: 'no_together',
			priority: rules.length,
			studentIds: [],
			label: '',
		};
		onRulesChange([...rules, newRule]);
	}

	function updateRule(updated: PlacementRule) {
		onRulesChange(rules.map((r) => (r.id === updated.id ? updated : r)));
	}

	function deleteRule(id: string) {
		onRulesChange(rules.filter((r) => r.id !== id));
	}

	function toggleSameNameSeparate(checked: boolean) {
		if (checked) {
			const newRule: PlacementRule = {
				id: crypto.randomUUID(),
				type: 'same_name_separate',
				priority: 0,
				studentIds: [],
				label: '동명이인 분리',
			};
			onRulesChange([newRule, ...rules]);
		} else {
			onRulesChange(rules.filter((r) => r.type !== 'same_name_separate'));
		}
	}

	const duplicateNames = findDuplicateNames(students);
	const duplicatePriorities = findDuplicatePriorities(rules);

	const hasInvalidRules =
		duplicatePriorities.size > 0 ||
		rules.some((r) => r.type !== 'same_name_separate' && r.priority < 1);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>배치 규칙 설정</CardTitle>
					<CardDescription>
						학생 배치 시 적용할 규칙들을 추가하세요. 우선순위가 높은 규칙부터
						먼저 적용됩니다.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2 rounded-lg border p-3">
						<Checkbox
							id="sameNameSeparate"
							checked={hasSameNameRule}
							onCheckedChange={(v) => toggleSameNameSeparate(v === true)}
						/>
						<Label htmlFor="sameNameSeparate" className="flex-1">
							동명이인 자동 분리
						</Label>
						{duplicateNames.length > 0 && (
							<span className="text-xs text-muted-foreground">
								감지된 동명이인: {duplicateNames.join(', ')}
							</span>
						)}
					</div>
				</CardContent>
			</Card>

			<div className="space-y-3">
				{rules
					.filter((r) => r.type !== 'same_name_separate')
					.map((rule, index) => (
						<RuleEditor
							key={rule.id}
							index={index}
							rule={rule}
							students={students}
							hasDuplicatePriority={duplicatePriorities.has(rule.priority)}
							onUpdate={updateRule}
							onDelete={() => deleteRule(rule.id)}
						/>
					))}
			</div>

			<Button variant="outline" onClick={addRule} className="w-full">
				<Plus className="size-4" />
				규칙 추가
			</Button>

			<div className="flex justify-between">
				<Button variant="outline" onClick={onBack}>
					이전 단계
				</Button>
				<Button onClick={onNext} disabled={hasInvalidRules}>
					배치 실행
				</Button>
			</div>
		</div>
	);
}

function findDuplicateNames(students: Student[]): string[] {
	const counts = new Map<string, number>();
	for (const s of students) {
		counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
	}
	return Array.from(counts.entries())
		.filter(([, count]) => count > 1)
		.map(([name]) => name);
}

function findDuplicatePriorities(rules: PlacementRule[]): Set<number> {
	const counts = new Map<number, number>();
	for (const r of rules) {
		if (r.type !== 'same_name_separate' && r.priority >= 1) {
			counts.set(r.priority, (counts.get(r.priority) ?? 0) + 1);
		}
	}
	return new Set(
		Array.from(counts.entries())
			.filter(([, count]) => count > 1)
			.map(([priority]) => priority),
	);
}
