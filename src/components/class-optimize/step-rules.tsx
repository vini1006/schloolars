import { Download, Plus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
	exportRulesToExcel,
	parseRulesFromFile,
} from '@/lib/class-optimize/excel-parser';
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
	const [importWarnings, setImportWarnings] = useState<string[]>([]);
	const [importError, setImportError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	function handleExport() {
		exportRulesToExcel(rules, students);
	}

	async function handleImportFile(file: File) {
		setImportError(null);
		setImportWarnings([]);
		try {
			const { rules: imported, warnings } = await parseRulesFromFile(
				file,
				students,
			);
			const sameNameRules = rules.filter(
				(r) => r.type === 'same_name_separate',
			);
			onRulesChange([...sameNameRules, ...imported]);
			setImportWarnings(warnings);
		} catch (e) {
			setImportError(
				e instanceof Error ? e.message : '파일 처리 중 오류가 발생했습니다.',
			);
		}
	}

	function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleImportFile(file);
		e.target.value = '';
	}

	const duplicateNames = findDuplicateNames(students);
	const duplicatePriorities = findDuplicatePriorities(rules);

	const hasInvalidRules =
		duplicatePriorities.size > 0 ||
		rules.some((r) => r.type !== 'same_name_separate' && r.priority < 1);

	const nonSameNameRules = rules.filter((r) => r.type !== 'same_name_separate');

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

					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
						>
							<Upload className="size-4" />
							규칙 불러오기
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							disabled={nonSameNameRules.length === 0}
						>
							<Download className="size-4" />
							규칙 내보내기
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept=".xlsx,.xls"
							className="hidden"
							onChange={handleFileInputChange}
						/>
					</div>
				</CardContent>
			</Card>

			{importError && (
				<Alert variant="destructive">
					<AlertDescription>{importError}</AlertDescription>
				</Alert>
			)}

			{importWarnings.length > 0 && (
				<Alert>
					<AlertDescription>
						<p className="mb-1 font-medium">
							규칙을 불러왔으나 일부 경고가 있습니다:
						</p>
						<ul className="list-inside list-disc space-y-0.5 text-sm">
							{importWarnings.map((w) => (
								<li key={w}>{w}</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}

			<div className="space-y-3">
				{nonSameNameRules.map((rule, index) => (
					<RuleEditor
						key={rule.id}
						index={index}
						rule={
							rule as PlacementRule & {
								type: Exclude<PlacementRule['type'], 'same_name_separate'>;
							}
						}
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
