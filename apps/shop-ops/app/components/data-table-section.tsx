type DataTableSectionProps = {
	heading: string;
	columns: string[];
	rows: Array<Record<string, string>>;
};

export function DataTableSection({ heading, columns, rows }: DataTableSectionProps) {
	return (
		<div className="mt-6 overflow-x-auto rounded-lg border border-border">
			<div className="border-b border-border px-4 py-3 text-sm font-medium">{heading}</div>
			<table className="min-w-full divide-y divide-border text-sm">
				<thead className="bg-muted/50">
					<tr>
						{columns.map((column) => (
							<th key={column} className="px-4 py-3 text-left font-medium">
								{column}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{rows.length === 0 ? (
						<tr>
							<td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">
								No rows found.
							</td>
						</tr>
					) : (
						rows.map((row, rowIndex) => (
							<tr key={`${heading}-${rowIndex}`} className="bg-card">
								{columns.map((column) => (
									<td key={column} className="px-4 py-3">
										{row[column]}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
