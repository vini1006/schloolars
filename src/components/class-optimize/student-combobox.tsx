import { ChevronsUpDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import type { Student } from '@/lib/class-optimize/types';

interface StudentComboboxProps {
	students: Student[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	placeholder?: string;
}

export function StudentCombobox({
	students,
	selectedIds,
	onChange,
	placeholder = '학생 검색...',
}: StudentComboboxProps) {
	const [open, setOpen] = useState(false);
	const studentsMap = useMemo(() => {
		return students.reduce(
			(acc, s) => {
				acc[s.id] = s;
				return acc;
			},
			{} as Record<string, Student>,
		);
	}, [students]);

	const selectedStudents = selectedIds
		.map((id) => studentsMap[id])
		.filter((s) => s !== undefined);

	function toggle(id: string) {
		if (selectedIds.includes(id)) {
			onChange(selectedIds.filter((sid) => sid !== id));
		} else {
			onChange([...selectedIds, id]);
		}
	}

	function remove(id: string) {
		onChange(selectedIds.filter((sid) => sid !== id));
	}

	return (
		<div className="space-y-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" className="w-full justify-between">
						<span className="truncate text-muted-foreground">
							{placeholder}
						</span>
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80 p-0">
					<Command>
						<CommandInput placeholder="이름 또는 ID로 검색..." />
						<CommandList>
							<CommandEmpty>학생을 찾을 수 없습니다.</CommandEmpty>
							<CommandGroup>
								{students.map((student) => (
									<CommandItem
										key={student.id}
										value={`${student.name} ${student.id}`}
										onSelect={() => toggle(student.id)}
										data-checked={selectedIds.includes(student.id)}
									>
										<span className="flex-1">{student.name}</span>
										<span className="text-xs text-muted-foreground">
											{student.id}
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{selectedStudents.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selectedStudents.map((s) => (
						<Badge key={s.id} variant="secondary" className="gap-1">
							{s.name} ({s.id})
							<button
								type="button"
								onClick={() => remove(s.id)}
								className="rounded-full hover:bg-muted-foreground/20"
							>
								<X className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
