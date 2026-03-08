import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { PlacementRule, Student } from '@/lib/class-optimize/types';
import { StudentCombobox } from './student-combobox';

const RULE_TYPE_LABELS: Record<PlacementRule['type'], string> = {
	no_together: '붙이면 안되는 학생들',
	separate_1_to_n: '분리 필요학생 (1:N)',
	same_name_separate: '동명이인 분리',
};

interface RuleEditorProps {
	rule: PlacementRule;
	students: Student[];
	onUpdate: (rule: PlacementRule) => void;
	onDelete: () => void;
}

export function RuleEditor({
	rule,
	students,
	onUpdate,
	onDelete,
}: RuleEditorProps) {
	return (
		<Card size="sm">
			<CardHeader className="flex-row items-center justify-between">
				<div className="flex items-center gap-2">
					<Badge variant="outline">#{rule.priority}</Badge>
					<CardTitle>{rule.label || RULE_TYPE_LABELS[rule.type]}</CardTitle>
				</div>
				<Button variant="ghost" size="icon-xs" onClick={onDelete}>
					<Trash2 className="size-4" />
				</Button>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label>규칙 유형</Label>
						<Select
							value={rule.type}
							onValueChange={(v) =>
								onUpdate({
									...rule,
									type: v as PlacementRule['type'],
									studentIds: v === 'same_name_separate' ? [] : rule.studentIds,
								})
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="no_together">
									붙이면 안되는 학생들
								</SelectItem>
								<SelectItem value="separate_1_to_n">
									분리 필요학생 (1:N)
								</SelectItem>
								<SelectItem value="same_name_separate">
									동명이인 분리
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label>우선순위</Label>
						<Input
							type="number"
							min={1}
							value={rule.priority}
							onChange={(e) =>
								onUpdate({
									...rule,
									priority: Number(e.target.value),
								})
							}
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label>규칙 이름</Label>
					<Input
						value={rule.label}
						onChange={(e) => onUpdate({ ...rule, label: e.target.value })}
						placeholder="규칙 설명 (선택)"
					/>
				</div>

				{rule.type !== 'same_name_separate' && (
					<div className="space-y-1.5">
						<Label>
							{rule.type === 'separate_1_to_n'
								? '기준 학생 (첫 번째) + 분리 대상'
								: '분리할 학생들'}
						</Label>
						<StudentCombobox
							students={students}
							selectedIds={rule.studentIds}
							onChange={(ids) => onUpdate({ ...rule, studentIds: ids })}
							placeholder={
								rule.type === 'separate_1_to_n'
									? '첫 번째 선택이 기준 학생입니다'
									: '학생을 선택하세요'
							}
						/>
					</div>
				)}

				{rule.type === 'same_name_separate' && (
					<p className="text-sm text-muted-foreground">
						같은 이름의 학생들을 자동으로 감지하여 분리합니다.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
